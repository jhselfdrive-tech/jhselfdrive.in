-- Phase 7: a payment ledger, and a customer-message log so every booking
-- event produces exactly one notification whose outcome is recorded.

-- ---------------------------------------------------------------------------
-- 1. Payment ledger — the single source of truth for money on a booking
-- ---------------------------------------------------------------------------

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  -- Set when the row came from a handover checklist rather than being entered
  -- on its own; lets a re-saved handover update its entry instead of adding one.
  handover_id uuid references public.booking_handovers(id) on delete cascade,
  kind text not null check (kind in ('rental', 'deposit', 'refund')),
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'upi', 'bank', 'other')),
  note text,
  received_at timestamptz not null default now(),
  recorded_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_payments_booking_idx on public.booking_payments(booking_id, received_at);

create unique index if not exists booking_payments_handover_kind_idx
  on public.booking_payments(handover_id, kind)
  where handover_id is not null;

alter table public.booking_payments enable row level security;
revoke all on public.booking_payments from anon, authenticated;

-- Move existing handover money onto the ledger. The 0004 column comment
-- defines deposit_amount as collected at delivery and refunded at return, so
-- the return row becomes a refund.
insert into public.booking_payments (booking_id, handover_id, kind, amount, method, note, received_at, recorded_by)
select h.booking_id, h.id, 'rental', h.payment_amount, 'cash', 'Backfilled from handover checklist', h.recorded_at, h.recorded_by
from public.booking_handovers h
where h.payment_amount > 0
on conflict (handover_id, kind) where handover_id is not null do nothing;

insert into public.booking_payments (booking_id, handover_id, kind, amount, method, note, received_at, recorded_by)
select h.booking_id, h.id, case when h.phase = 'return' then 'refund' else 'deposit' end,
       h.deposit_amount, 'cash', 'Backfilled from handover checklist', h.recorded_at, h.recorded_by
from public.booking_handovers h
where h.deposit_amount > 0
on conflict (handover_id, kind) where handover_id is not null do nothing;

-- ---------------------------------------------------------------------------
-- 2. Checklist view now reads the ledger
-- ---------------------------------------------------------------------------

create or replace view public.booking_checklist_status
with (security_invoker = true)
as
select
  b.id as booking_id,
  (delivery.id is not null) as has_delivery,
  (returned.id is not null) as has_return,
  coalesce((select sum(p.amount) from public.booking_payments p where p.booking_id = b.id and p.kind = 'rental'), 0) as amount_collected,
  coalesce((select sum(p.amount) from public.booking_payments p where p.booking_id = b.id and p.kind = 'deposit'), 0) as deposit_collected,
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
  ) as return_condition_count,
  -- Appended last on purpose: create or replace view cannot insert a column
  -- into the middle of an existing view's column list.
  coalesce((select sum(p.amount) from public.booking_payments p where p.booking_id = b.id and p.kind = 'refund'), 0) as deposit_refunded
from public.bookings b
left join public.booking_handovers delivery on delivery.booking_id = b.id and delivery.phase = 'delivery'
left join public.booking_handovers returned on returned.booking_id = b.id and returned.phase = 'return';

revoke all on public.booking_checklist_status from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Handovers write through to the ledger
-- ---------------------------------------------------------------------------

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
  v_deposit_kind text;
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

  -- Mirror the checklist's money onto the ledger. Upserting on
  -- (handover_id, kind) keeps a re-saved checklist from double-counting, and a
  -- cleared amount removes its entry.
  v_deposit_kind := case when p_phase = 'return' then 'refund' else 'deposit' end;

  if coalesce(p_payment_amount, 0) > 0 then
    insert into public.booking_payments (booking_id, handover_id, kind, amount, method, note, received_at, recorded_by)
    values (p_booking_id, v_handover_id, 'rental', p_payment_amount, 'cash', 'Recorded on the ' || p_phase || ' checklist', now(), p_recorded_by)
    on conflict (handover_id, kind) where handover_id is not null
    do update set amount = excluded.amount, received_at = now(), recorded_by = excluded.recorded_by;
  else
    delete from public.booking_payments where handover_id = v_handover_id and kind = 'rental';
  end if;

  if coalesce(p_deposit_amount, 0) > 0 then
    insert into public.booking_payments (booking_id, handover_id, kind, amount, method, note, received_at, recorded_by)
    values (p_booking_id, v_handover_id, v_deposit_kind, p_deposit_amount, 'cash', 'Recorded on the ' || p_phase || ' checklist', now(), p_recorded_by)
    on conflict (handover_id, kind) where handover_id is not null
    do update set amount = excluded.amount, received_at = now(), recorded_by = excluded.recorded_by;
  else
    delete from public.booking_payments where handover_id = v_handover_id and kind = v_deposit_kind;
  end if;

  if p_phase = 'return' and v_vehicle_id is not null and p_odometer_km is not null then
    update public.vehicles set odometer_km = p_odometer_km where id = v_vehicle_id;
  end if;

  return v_handover_id;
end;
$$;

revoke all on function public.save_booking_handover(uuid, text, integer, smallint, boolean, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.save_booking_handover(uuid, text, integer, smallint, boolean, numeric, numeric, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Customer message log
-- ---------------------------------------------------------------------------

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  -- Stable identity for the thing that happened. The unique constraint below
  -- is what makes a duplicate notification impossible: "trip started" and
  -- "delivery checklist saved" deliberately share one key.
  event_key text not null check (length(event_key) between 1 and 120),
  template_id text not null,
  -- Composed when the event fires, so the log shows the text that was offered
  -- even if the templates are later reworded.
  body text not null,
  phone text not null,
  status text not null default 'due' check (status in ('due', 'sent', 'skipped')),
  sent_at timestamptz,
  skipped_reason text,
  actor text,
  created_at timestamptz not null default now(),
  unique (booking_id, event_key)
);

create index if not exists booking_messages_booking_idx on public.booking_messages(booking_id, created_at);
create index if not exists booking_messages_due_idx on public.booking_messages(status) where status = 'due';

alter table public.booking_messages enable row level security;
revoke all on public.booking_messages from anon, authenticated;
