-- Phase 6: the physical vehicle becomes the bookable unit.
--   * vehicles carry their own commercial terms and photos
--   * customers pick a real car for real dates
--   * bookings move through an enforced lifecycle with an audit trail

-- ---------------------------------------------------------------------------
-- 1. Vehicles become sellable
-- ---------------------------------------------------------------------------

alter table public.vehicles add column day_rate numeric(10,2) not null default 0 check (day_rate >= 0);
alter table public.vehicles add column km_rate numeric(10,2) check (km_rate >= 0);
alter table public.vehicles add column included_km_per_day integer check (included_km_per_day >= 0);
alter table public.vehicles add column deposit numeric(10,2) not null default 5000 check (deposit >= 0);
alter table public.vehicles add column tagline text;
alter table public.vehicles add column description text;
alter table public.vehicles add column is_bookable boolean not null default true;

-- Seed commercial terms from the launch category rates in src/content/site.ts.
update public.vehicles set day_rate = 1800, km_rate = 12, included_km_per_day = 250 where category_slug = 'city-hatchback' and day_rate = 0;
update public.vehicles set day_rate = 2500, km_rate = 15, included_km_per_day = 250 where category_slug = 'compact-suv' and day_rate = 0;
update public.vehicles set day_rate = 3200, km_rate = 18, included_km_per_day = 250 where category_slug = 'family-mpv' and day_rate = 0;

create index vehicles_bookable_idx on public.vehicles(is_bookable, status);

-- ---------------------------------------------------------------------------
-- 2. Vehicle photos (public bucket)
-- ---------------------------------------------------------------------------

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  file_path text unique not null,
  file_name text,
  file_mime text,
  file_size_bytes integer check (file_size_bytes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_photos_vehicle_idx on public.vehicle_photos(vehicle_id, sort_order);

alter table public.vehicle_photos enable row level security;
revoke all on public.vehicle_photos from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fleet-photos', 'fleet-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3. Booking lifecycle
-- ---------------------------------------------------------------------------

alter table public.bookings drop constraint if exists bookings_status_check;
update public.bookings set status = 'requested' where status = 'pending';
alter table public.bookings add constraint bookings_status_check
  check (status in ('requested', 'approved', 'confirmed', 'ongoing', 'completed', 'cancelled', 'rejected'));
alter table public.bookings alter column status set default 'requested';

-- Approval is the point of commitment, so an approved booking must hold its car.
alter table public.bookings drop constraint if exists bookings_no_vehicle_overlap;
alter table public.bookings add constraint bookings_no_vehicle_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('approved', 'confirmed', 'ongoing', 'completed'));

create table public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  message_template_id text,
  message_sent_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index booking_status_events_booking_idx on public.booking_status_events(booking_id, created_at);

alter table public.booking_status_events enable row level security;
revoke all on public.booking_status_events from anon, authenticated;

-- Seed an opening event for every existing booking so the timeline is never empty.
insert into public.booking_status_events (booking_id, from_status, to_status, note, created_by, created_at)
select b.id, null, b.status, 'Backfilled from booking history', coalesce(b.created_by, 'system'), b.created_at
from public.bookings b;

-- ---------------------------------------------------------------------------
-- 4. Analytics: booking_* events were never permitted by the 0001 check
-- ---------------------------------------------------------------------------

alter table public.events drop constraint if exists events_name_check;
alter table public.events add constraint events_name_check
  check (name in (
    'page_view', 'whatsapp_click', 'call_click', 'fleet_card_view',
    'enquiry_started', 'enquiry_submitted',
    'booking_started', 'booking_dates_selected', 'booking_submitted'
  ));

-- ---------------------------------------------------------------------------
-- 5. Public availability: every bookable vehicle free in a window
-- ---------------------------------------------------------------------------

create or replace function public.list_bookable_vehicles(
  p_start_at timestamptz,
  p_end_at timestamptz
) returns table (
  id uuid,
  registration_number text,
  display_name text,
  category_slug text,
  model text,
  year integer,
  transmission text,
  fuel text,
  seats integer,
  day_rate numeric,
  km_rate numeric,
  included_km_per_day integer,
  deposit numeric,
  tagline text,
  description text,
  photo_path text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    v.id, v.registration_number, v.display_name, v.category_slug, v.model, v.year,
    v.transmission, v.fuel, v.seats, v.day_rate, v.km_rate, v.included_km_per_day,
    v.deposit, v.tagline, v.description,
    (
      select vp.file_path from public.vehicle_photos vp
      where vp.vehicle_id = v.id
      order by vp.sort_order, vp.created_at
      limit 1
    ) as photo_path
  from public.vehicles v
  where v.status = 'active'
    and v.is_bookable
    and p_end_at > p_start_at
    and not exists (
      select 1 from public.bookings b
      where b.vehicle_id = v.id
        and b.status in ('approved', 'confirmed', 'ongoing', 'completed')
        and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
    and not exists (
      select 1 from public.vehicle_blocks vb
      where vb.vehicle_id = v.id
        and tstzrange(vb.start_at, vb.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
  order by v.day_rate, coalesce(v.display_name, v.registration_number);
$$;

revoke all on function public.list_bookable_vehicles(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.list_bookable_vehicles(timestamptz, timestamptz) to service_role;

-- Admin availability must agree with the new blocking-status set.
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
    and (p_category_slug is null or v.category_slug = p_category_slug)
    and p_end_at > p_start_at
    and not exists (
      select 1
      from public.bookings b
      where b.vehicle_id = v.id
        and b.status in ('approved', 'confirmed', 'ongoing', 'completed')
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

-- ---------------------------------------------------------------------------
-- 6. Website books a specific vehicle; price is computed server-side
-- ---------------------------------------------------------------------------

drop function if exists public.record_direct_booking(text, text, text, text, timestamptz, timestamptz, numeric, numeric, text, text, text);

create or replace function public.record_vehicle_booking(
  p_phone text,
  p_full_name text,
  p_city text,
  p_vehicle_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_notes text default null,
  p_ip_hash text default null,
  p_session_id text default null
) returns table(customer_id uuid, booking_id uuid, amount_total numeric, deposit numeric, days integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
  v_vehicle public.vehicles%rowtype;
  v_days integer;
  v_amount numeric;
begin
  if p_end_at <= p_start_at then
    raise exception using errcode = '22007', message = 'INVALID_HANDOVER_RANGE';
  end if;

  if p_ip_hash is not null and length(p_ip_hash) > 0 then
    perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
    if (select count(*) from public.enquiry_rate_limits where ip_hash = p_ip_hash and created_at >= now() - interval '1 hour') >= 10 then
      raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
    end if;
    insert into public.enquiry_rate_limits (ip_hash) values (p_ip_hash);
  end if;

  -- Lock the vehicle row so two concurrent requests cannot both pass the
  -- availability re-check below.
  select * into v_vehicle from public.vehicles where id = p_vehicle_id for update;
  if v_vehicle.id is null then
    raise exception using errcode = 'P0002', message = 'VEHICLE_NOT_FOUND';
  end if;
  if v_vehicle.status <> 'active' or not v_vehicle.is_bookable then
    raise exception using errcode = 'P0001', message = 'VEHICLE_UNAVAILABLE';
  end if;
  if not exists (
    select 1 from public.list_bookable_vehicles(p_start_at, p_end_at) where id = p_vehicle_id
  ) then
    raise exception using errcode = 'P0001', message = 'VEHICLE_UNAVAILABLE';
  end if;

  -- Price is derived from the vehicle, never from the client.
  v_days := greatest(1, ceil(extract(epoch from (p_end_at - p_start_at)) / 86400.0)::integer);
  v_amount := round(v_vehicle.day_rate * v_days, 2);

  insert into public.customers (phone, full_name, city)
  values (p_phone, p_full_name, coalesce(nullif(p_city, ''), 'Ramanathapuram'))
  on conflict (phone) do update
    set full_name = coalesce(excluded.full_name, customers.full_name),
        city = coalesce(nullif(excluded.city, ''), customers.city),
        last_seen_at = now()
  returning id into v_customer_id;

  insert into public.bookings (
    customer_id, car_slug, vehicle_id, start_at, end_at,
    amount_total, deposit, status, notes, created_by
  ) values (
    v_customer_id, v_vehicle.category_slug, p_vehicle_id, p_start_at, p_end_at,
    v_amount, v_vehicle.deposit, 'requested', nullif(p_notes, ''), 'website'
  ) returning id into v_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, created_by)
  values (v_booking_id, null, 'requested', 'Submitted from the website', 'website');

  insert into public.events (session_id, name, car_slug)
  values (coalesce(nullif(p_session_id, ''), 'server'), 'booking_submitted', v_vehicle.category_slug);

  return query select v_customer_id, v_booking_id, v_amount, v_vehicle.deposit, v_days;
end;
$$;

revoke all on function public.record_vehicle_booking(text, text, text, uuid, timestamptz, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.record_vehicle_booking(text, text, text, uuid, timestamptz, timestamptz, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Status transitions are applied through one guarded function
-- ---------------------------------------------------------------------------

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_to_status text,
  p_actor text,
  p_note text default null,
  p_vehicle_id uuid default null,
  p_amount_total numeric default null,
  p_deposit numeric default null,
  p_deposit_returned boolean default null
) returns table(from_status text, to_status text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_vehicle_id uuid;
  v_allowed text[];
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception using errcode = 'P0002', message = 'BOOKING_NOT_FOUND';
  end if;

  v_allowed := case v_booking.status
    when 'requested' then array['approved', 'rejected', 'cancelled']
    when 'approved'  then array['confirmed', 'cancelled', 'rejected']
    when 'confirmed' then array['ongoing', 'cancelled']
    when 'ongoing'   then array['completed']
    else array[]::text[]
  end;

  if not (p_to_status = any(v_allowed)) then
    raise exception using errcode = 'P0001', message = 'ILLEGAL_TRANSITION';
  end if;

  v_vehicle_id := coalesce(p_vehicle_id, v_booking.vehicle_id);

  if p_to_status in ('confirmed', 'ongoing', 'completed') and v_vehicle_id is null then
    raise exception using errcode = 'P0001', message = 'VEHICLE_REQUIRED';
  end if;

  -- Re-check availability whenever the vehicle changes into a blocking status.
  if v_vehicle_id is not null
     and p_to_status in ('approved', 'confirmed')
     and not exists (
       select 1 from public.find_available_vehicles(null::text, v_booking.start_at, v_booking.end_at, p_booking_id)
       where id = v_vehicle_id
     ) then
    raise exception using errcode = 'P0001', message = 'VEHICLE_UNAVAILABLE';
  end if;

  update public.bookings set
    status = p_to_status,
    vehicle_id = v_vehicle_id,
    amount_total = coalesce(p_amount_total, amount_total),
    deposit = coalesce(p_deposit, deposit),
    deposit_returned = coalesce(p_deposit_returned, deposit_returned),
    notes = coalesce(nullif(p_note, ''), notes)
  where id = p_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, created_by)
  values (p_booking_id, v_booking.status, p_to_status, nullif(p_note, ''), p_actor);

  return query select v_booking.status, p_to_status;
end;
$$;

revoke all on function public.transition_booking(uuid, text, text, text, uuid, numeric, numeric, boolean) from public, anon, authenticated;
grant execute on function public.transition_booking(uuid, text, text, text, uuid, numeric, numeric, boolean) to service_role;
