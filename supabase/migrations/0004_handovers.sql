alter table public.vehicle_documents
  add column file_path text,
  add column file_name text,
  add column file_mime text check (file_mime is null or file_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  add column file_size_bytes integer check (file_size_bytes is null or file_size_bytes between 1 and 12582912);

alter table public.vehicle_documents add constraint vehicle_documents_file_complete
  check (num_nonnulls(file_path, file_name, file_mime, file_size_bytes) in (0, 4));

create table public.booking_handovers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  phase text not null check (phase in ('delivery', 'return')),
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  fuel_eighths smallint check (fuel_eighths is null or fuel_eighths between 0 and 8),
  payment_received boolean not null default false,
  payment_amount numeric(10,2) not null default 0 check (payment_amount >= 0),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  damage_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, phase)
);

comment on column public.booking_handovers.deposit_amount is
  'Deposit collected during delivery or refunded during return, according to phase.';

create table public.booking_media (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  phase text not null check (phase in ('delivery', 'return')),
  media_type text not null check (media_type in ('licence_front', 'licence_back', 'vehicle_condition')),
  bucket_id text not null check (bucket_id in ('rental-documents', 'rental-identity')),
  file_path text unique not null,
  file_name text not null,
  file_mime text not null check (file_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 8388608),
  purge_after date not null,
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  check (
    (media_type in ('licence_front', 'licence_back') and bucket_id = 'rental-identity')
    or (media_type = 'vehicle_condition' and bucket_id = 'rental-documents')
  )
);

create unique index booking_media_one_licence_slot_idx
  on public.booking_media(booking_id, media_type)
  where media_type in ('licence_front', 'licence_back');

create table public.booking_share_links (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token text unique not null check (token ~ '^[A-Za-z0-9_-]{43}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create unique index booking_share_links_one_live_idx
  on public.booking_share_links(booking_id)
  where revoked_at is null;

create index booking_handovers_booking_idx on public.booking_handovers(booking_id);
create index booking_media_booking_idx on public.booking_media(booking_id);
create index booking_media_purge_idx on public.booking_media(purge_after);
create index booking_share_links_token_idx on public.booking_share_links(token);

alter table public.booking_handovers enable row level security;
alter table public.booking_media enable row level security;
alter table public.booking_share_links enable row level security;
revoke all on public.booking_handovers, public.booking_media, public.booking_share_links from anon, authenticated;

create or replace view public.booking_checklist_status
with (security_invoker = true)
as
select
  b.id as booking_id,
  (delivery.id is not null) as has_delivery,
  (returned.id is not null) as has_return,
  coalesce(delivery.payment_amount, 0) + coalesce(returned.payment_amount, 0) as amount_collected,
  coalesce(delivery.deposit_amount, 0) as deposit_collected,
  delivery.odometer_km as delivery_odometer_km,
  returned.odometer_km as return_odometer_km,
  delivery.fuel_eighths as delivery_fuel_eighths,
  returned.fuel_eighths as return_fuel_eighths,
  exists (
    select 1 from public.booking_media bm
    where bm.booking_id = b.id and bm.media_type = 'licence_front'
  ) as has_licence_front,
  exists (
    select 1 from public.booking_media bm
    where bm.booking_id = b.id and bm.media_type = 'licence_back'
  ) as has_licence_back,
  (
    select count(*)::integer from public.booking_media bm
    where bm.booking_id = b.id and bm.phase = 'delivery' and bm.media_type = 'vehicle_condition'
  ) as delivery_condition_count,
  (
    select count(*)::integer from public.booking_media bm
    where bm.booking_id = b.id and bm.phase = 'return' and bm.media_type = 'vehicle_condition'
  ) as return_condition_count
from public.bookings b
left join public.booking_handovers delivery on delivery.booking_id = b.id and delivery.phase = 'delivery'
left join public.booking_handovers returned on returned.booking_id = b.id and returned.phase = 'return';

revoke all on public.booking_checklist_status from anon, authenticated;

create or replace function public.save_booking_handover(
  p_booking_id uuid,
  p_phase text,
  p_odometer_km integer,
  p_fuel_eighths smallint,
  p_payment_received boolean,
  p_payment_amount numeric,
  p_deposit_amount numeric,
  p_damage_notes text,
  p_notes text,
  p_recorded_by text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_handover_id uuid;
  v_vehicle_id uuid;
begin
  if p_phase not in ('delivery', 'return') then
    raise exception using errcode = 'P0001', message = 'INVALID_HANDOVER_PHASE';
  end if;

  select vehicle_id into v_vehicle_id
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND';
  end if;

  insert into public.booking_handovers (
    booking_id, phase, recorded_by, recorded_at, odometer_km, fuel_eighths,
    payment_received, payment_amount, deposit_amount, damage_notes, notes
  ) values (
    p_booking_id, p_phase, p_recorded_by, now(), p_odometer_km, p_fuel_eighths,
    p_payment_received, coalesce(p_payment_amount, 0), coalesce(p_deposit_amount, 0),
    nullif(p_damage_notes, ''), nullif(p_notes, '')
  )
  on conflict (booking_id, phase) do update set
    recorded_by = excluded.recorded_by,
    recorded_at = now(),
    odometer_km = excluded.odometer_km,
    fuel_eighths = excluded.fuel_eighths,
    payment_received = excluded.payment_received,
    payment_amount = excluded.payment_amount,
    deposit_amount = excluded.deposit_amount,
    damage_notes = excluded.damage_notes,
    notes = excluded.notes,
    updated_at = now()
  returning id into v_handover_id;

  if p_phase = 'return' and v_vehicle_id is not null and p_odometer_km is not null then
    update public.vehicles set odometer_km = p_odometer_km where id = v_vehicle_id;
  end if;

  return v_handover_id;
end;
$$;

revoke all on function public.save_booking_handover(uuid, text, integer, smallint, boolean, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.save_booking_handover(uuid, text, integer, smallint, boolean, numeric, numeric, text, text, text) to service_role;

create or replace function public.rotate_booking_share_link(
  p_booking_id uuid,
  p_token text,
  p_expires_at timestamptz,
  p_created_by text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  if p_token !~ '^[A-Za-z0-9_-]{43}$' or p_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_SHARE_LINK';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_booking_id::text, 0));

  if not exists (select 1 from public.bookings where id = p_booking_id) then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND';
  end if;

  update public.booking_share_links
  set revoked_at = now()
  where booking_id = p_booking_id and revoked_at is null;

  insert into public.booking_share_links (booking_id, token, expires_at, created_by)
  values (p_booking_id, p_token, p_expires_at, p_created_by)
  returning id into v_link_id;

  return v_link_id;
end;
$$;

revoke all on function public.rotate_booking_share_link(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.rotate_booking_share_link(uuid, text, timestamptz, text) to service_role;

create or replace function public.touch_booking_share_link(p_token text) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.booking_share_links
  set view_count = view_count + 1,
      last_viewed_at = now()
  where token = p_token
    and revoked_at is null
    and expires_at > now();
end;
$$;

revoke all on function public.touch_booking_share_link(text) from public, anon, authenticated;
grant execute on function public.touch_booking_share_link(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('rental-documents', 'rental-documents', false, 12582912, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('rental-identity', 'rental-identity', false, 8388608, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
