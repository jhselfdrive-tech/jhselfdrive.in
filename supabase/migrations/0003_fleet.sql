create extension if not exists btree_gist;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique not null check (
    registration_number = upper(registration_number)
    and registration_number !~ '\\s'
  ),
  display_name text,
  category_slug text not null check (length(category_slug) > 0),
  model text,
  year integer check (year between 1980 and 2100),
  transmission text,
  fuel text,
  seats integer check (seats between 1 and 60),
  status text not null default 'active' check (status in ('active', 'maintenance', 'retired', 'sold')),
  odometer_km integer check (odometer_km >= 0),
  acquired_on date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  doc_type text not null check (doc_type in ('insurance', 'fitness', 'permit', 'puc', 'road_tax')),
  provider text,
  reference_number text,
  issued_on date,
  expires_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  check (issued_on is null or expires_on >= issued_on)
);

create table public.vehicle_blocks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index vehicles_status_category_idx on public.vehicles(status, category_slug);
create index vehicle_documents_vehicle_idx on public.vehicle_documents(vehicle_id);
create index vehicle_documents_expiry_idx on public.vehicle_documents(expires_on);
create index vehicle_blocks_vehicle_idx on public.vehicle_blocks(vehicle_id);

alter table public.vehicle_blocks add constraint vehicle_blocks_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  );

alter table public.bookings add column vehicle_id uuid references public.vehicles(id) on delete restrict;
alter table public.bookings add column start_at timestamptz;
alter table public.bookings add column end_at timestamptz;

-- Existing multi-day bookings retain a 09:00 IST handover. A same-day legacy
-- booking is given an 18:00 return so its range remains non-empty.
update public.bookings
set
  start_at = (start_date::timestamp + time '09:00') at time zone 'Asia/Kolkata',
  end_at = (
    end_date::timestamp
    + case when end_date = start_date then time '18:00' else time '09:00' end
  ) at time zone 'Asia/Kolkata';

alter table public.bookings alter column start_at set not null;
alter table public.bookings alter column end_at set not null;
alter table public.bookings add constraint bookings_valid_handover_range check (end_at > start_at);

drop index if exists public.bookings_start_date_idx;
alter table public.bookings drop constraint if exists bookings_end_date_check;
alter table public.bookings drop column start_date;
alter table public.bookings drop column end_date;
alter table public.bookings add column start_date date generated always as (((start_at at time zone 'Asia/Kolkata')::date)) stored;
alter table public.bookings add column end_date date generated always as (((end_at at time zone 'Asia/Kolkata')::date)) stored;

create index bookings_vehicle_id_idx on public.bookings(vehicle_id);
create index bookings_start_at_idx on public.bookings(start_at desc);

alter table public.bookings add constraint bookings_no_vehicle_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('confirmed', 'ongoing', 'completed'));

alter table public.vehicles enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.vehicle_blocks enable row level security;
revoke all on public.vehicles, public.vehicle_documents, public.vehicle_blocks from anon, authenticated;

create or replace function public.find_available_vehicles(
  p_category_slug text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_booking_id uuid default null
) returns table (
  id uuid,
  registration_number text,
  display_name text,
  category_slug text,
  model text,
  seats integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select v.id, v.registration_number, v.display_name, v.category_slug, v.model, v.seats
  from public.vehicles v
  where v.status = 'active'
    and v.category_slug = p_category_slug
    and p_end_at > p_start_at
    and not exists (
      select 1
      from public.bookings b
      where b.vehicle_id = v.id
        and b.status in ('confirmed', 'ongoing', 'completed')
        and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
        and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
    and not exists (
      select 1
      from public.vehicle_blocks vb
      where vb.vehicle_id = v.id
        and tstzrange(vb.start_at, vb.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
  order by coalesce(v.display_name, v.registration_number), v.registration_number;
$$;

revoke all on function public.find_available_vehicles(text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.find_available_vehicles(text, timestamptz, timestamptz, uuid) to service_role;

drop function if exists public.create_booking_from_enquiry(uuid, text, date, date, numeric, numeric, text, text, text);

create function public.create_booking_from_enquiry(
  p_enquiry_id uuid,
  p_car_slug text,
  p_vehicle_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_amount_total numeric,
  p_deposit numeric,
  p_status text,
  p_notes text,
  p_created_by text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
begin
  if p_end_at <= p_start_at then
    raise exception using errcode = '22007', message = 'INVALID_HANDOVER_RANGE';
  end if;

  select customer_id into v_customer_id
  from public.enquiries
  where id = p_enquiry_id
  for update;

  if v_customer_id is null then
    raise exception using errcode = 'P0002', message = 'ENQUIRY_NOT_FOUND';
  end if;

  if p_vehicle_id is not null then
    if not exists (
      select 1 from public.vehicles
      where id = p_vehicle_id and status = 'active' and category_slug = p_car_slug
    ) then
      raise exception using errcode = 'P0001', message = 'VEHICLE_UNAVAILABLE';
    end if;

    if p_status in ('confirmed', 'ongoing', 'completed') and not exists (
      select 1 from public.find_available_vehicles(p_car_slug, p_start_at, p_end_at, null)
      where id = p_vehicle_id
    ) then
      raise exception using errcode = 'P0001', message = 'VEHICLE_UNAVAILABLE';
    end if;
  end if;

  insert into public.bookings (
    customer_id, enquiry_id, car_slug, vehicle_id, start_at, end_at,
    amount_total, deposit, status, notes, created_by
  ) values (
    v_customer_id, p_enquiry_id, p_car_slug, p_vehicle_id, p_start_at, p_end_at,
    p_amount_total, p_deposit, p_status, nullif(p_notes, ''), p_created_by
  ) returning id into v_booking_id;

  update public.enquiries set status = 'converted' where id = p_enquiry_id;
  return v_booking_id;
end;
$$;

revoke all on function public.create_booking_from_enquiry(uuid, text, uuid, timestamptz, timestamptz, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking_from_enquiry(uuid, text, uuid, timestamptz, timestamptz, numeric, numeric, text, text, text) to service_role;

create or replace view public.vehicle_alerts
with (security_invoker = true)
as
with latest_documents as (
  select distinct on (vd.vehicle_id, vd.doc_type)
    vd.id,
    vd.vehicle_id,
    vd.doc_type,
    vd.provider,
    vd.reference_number,
    vd.expires_on
  from public.vehicle_documents vd
  order by vd.vehicle_id, vd.doc_type, vd.expires_on desc, vd.created_at desc
)
select
  ld.id,
  ld.vehicle_id,
  v.registration_number,
  coalesce(v.display_name, v.registration_number) as vehicle_name,
  ld.doc_type,
  ld.provider,
  ld.reference_number,
  ld.expires_on,
  (ld.expires_on - current_date)::integer as days_remaining
from latest_documents ld
join public.vehicles v on v.id = ld.vehicle_id
where ld.expires_on <= current_date + 30
  and v.status not in ('retired', 'sold');

revoke all on public.vehicle_alerts from anon, authenticated;
