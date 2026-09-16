-- Allow 'pending' in bookings.status so direct website bookings can be stored
-- before admin physical vehicle assignment and approval.

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'ongoing', 'completed', 'cancelled'));

-- Update the exclusion constraint on bookings so pending bookings (which don't have
-- vehicle_id or are awaiting approval) don't block vehicles until confirmed/ongoing/completed.
-- (This is already conditioned on 'where (status in ('confirmed', 'ongoing', 'completed'))'
-- in 0003_fleet.sql).

-- Allow rate limits table to also serve booking rate limits or add general submission cap.
create or replace function public.record_direct_booking(
  p_phone text,
  p_full_name text,
  p_city text,
  p_car_slug text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_amount_total numeric,
  p_deposit numeric,
  p_notes text default null,
  p_ip_hash text default null,
  p_session_id text default null
) returns table(customer_id uuid, booking_id uuid)
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

  -- Protect against automated spam if ip_hash is supplied
  if p_ip_hash is not null and length(p_ip_hash) > 0 then
    perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
    if (select count(*) from public.enquiry_rate_limits where ip_hash = p_ip_hash and created_at >= now() - interval '1 hour') >= 10 then
      raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
    end if;
    insert into public.enquiry_rate_limits (ip_hash) values (p_ip_hash);
  end if;

  -- Upsert customer
  insert into public.customers (phone, full_name, city, enquiry_count)
  values (p_phone, p_full_name, coalesce(nullif(p_city, ''), 'Ramanathapuram'), 1)
  on conflict (phone) do update
    set full_name = coalesce(excluded.full_name, customers.full_name),
        city = coalesce(nullif(excluded.city, ''), customers.city),
        last_seen_at = now()
  returning id into v_customer_id;

  -- Insert pending booking awaiting admin review & fleet assignment
  insert into public.bookings (
    customer_id,
    car_slug,
    start_at,
    end_at,
    amount_total,
    deposit,
    status,
    notes,
    created_by
  ) values (
    v_customer_id,
    p_car_slug,
    p_start_at,
    p_end_at,
    p_amount_total,
    p_deposit,
    'pending',
    nullif(p_notes, ''),
    'website'
  ) returning id into v_booking_id;

  return query select v_customer_id, v_booking_id;
end;
$$;

revoke all on function public.record_direct_booking(text, text, text, text, timestamptz, timestamptz, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.record_direct_booking(text, text, text, text, timestamptz, timestamptz, numeric, numeric, text, text, text) to service_role;

