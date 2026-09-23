-- Native bookings are a transaction: a failed booking never leaves a customer behind.
create or replace function public.record_admin_booking(
  p_vehicle_id uuid, p_start_at timestamptz, p_end_at timestamptz,
  p_status text, p_created_by text,
  p_customer_id uuid default null, p_phone text default null,
  p_full_name text default null, p_city text default null,
  p_amount_total numeric default null, p_deposit numeric default null, p_notes text default null
) returns table(customer_id uuid, booking_id uuid, amount_total numeric, deposit numeric, days integer)
language plpgsql security invoker set search_path = public as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_customer_id uuid;
  v_booking_id uuid;
  v_days integer;
  v_amount numeric;
  v_deposit numeric;
begin
  if p_start_at is null or p_end_at is null or not isfinite(p_start_at) or not isfinite(p_end_at) or p_end_at <= p_start_at then
    raise exception using errcode = '22007', message = 'INVALID_HANDOVER_RANGE';
  end if;
  if p_status is null or p_status not in ('approved', 'confirmed', 'ongoing', 'completed') then
    raise exception 'ILLEGAL_TRANSITION';
  end if;
  if nullif(trim(p_created_by), '') is null then raise exception 'Admin email is required'; end if;
  if p_amount_total < 0 or p_deposit < 0 then raise exception 'Amounts cannot be negative'; end if;
  select * into v_vehicle from public.vehicles where id = p_vehicle_id for update;
  if v_vehicle.id is null then raise exception 'VEHICLE_NOT_FOUND'; end if;
  if p_status in ('approved', 'confirmed', 'ongoing', 'completed') and not exists (
    select 1 from public.find_available_vehicles(null::text, p_start_at, p_end_at, null::uuid) where id = p_vehicle_id
  ) then raise exception 'VEHICLE_UNAVAILABLE'; end if;
  v_days := greatest(1, ceil(extract(epoch from (p_end_at - p_start_at)) / 86400.0)::integer);
  -- Same whole-rupee rounding as quoteRental.
  v_amount := coalesce(p_amount_total, round(v_vehicle.day_rate * v_days));
  v_deposit := coalesce(p_deposit, v_vehicle.deposit);
  if p_customer_id is not null then
    select id into v_customer_id from public.customers where id = p_customer_id;
    if v_customer_id is null then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  else
    if nullif(trim(p_phone), '') is null then raise exception 'PHONE_REQUIRED'; end if;
    insert into public.customers (phone, full_name, city)
    values (p_phone, nullif(p_full_name, ''), coalesce(nullif(p_city, ''), 'Ramanathapuram'))
    on conflict (phone) do update set
      full_name = coalesce(excluded.full_name, customers.full_name),
      city = coalesce(nullif(excluded.city, ''), customers.city), last_seen_at = now()
    returning id into v_customer_id;
  end if;
  insert into public.bookings (customer_id, car_slug, vehicle_id, start_at, end_at, amount_total, deposit, status, notes, created_by)
  values (v_customer_id, v_vehicle.category_slug, p_vehicle_id, p_start_at, p_end_at, v_amount, v_deposit, p_status, nullif(p_notes, ''), p_created_by)
  returning id into v_booking_id;
  insert into public.booking_status_events (booking_id, from_status, to_status, note, created_by)
  values (v_booking_id, null, p_status, 'Recorded in the ops app', p_created_by);
  return query select v_customer_id, v_booking_id, v_amount, v_deposit, v_days;
end;
$$;
revoke all on function public.record_admin_booking(uuid,timestamptz,timestamptz,text,text,uuid,text,text,text,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.record_admin_booking(uuid,timestamptz,timestamptz,text,text,uuid,text,text,text,numeric,numeric,text) to service_role;

-- Admins can explicitly schedule maintenance vehicles. Public list_bookable_vehicles
-- still requires active + is_bookable. Blocks and booking overlap always apply.
create or replace function public.find_available_vehicles(
  p_category_slug text, p_start_at timestamptz, p_end_at timestamptz, p_exclude_booking_id uuid default null
) returns table(id uuid, registration_number text, display_name text, category_slug text, model text, seats integer)
language sql stable security invoker set search_path = public as $$
  select v.id, v.registration_number, v.display_name, v.category_slug, v.model, v.seats
  from public.vehicles v
  where v.status in ('active', 'maintenance')
    and (p_category_slug is null or v.category_slug = p_category_slug)
    and p_end_at > p_start_at
    and not exists (select 1 from public.bookings b where b.vehicle_id = v.id
      and b.status in ('approved', 'confirmed', 'ongoing', 'completed')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(p_start_at,p_end_at,'[)'))
    and not exists (select 1 from public.vehicle_blocks vb where vb.vehicle_id = v.id
      and tstzrange(vb.start_at,vb.end_at,'[)') && tstzrange(p_start_at,p_end_at,'[)'))
  order by coalesce(v.display_name,v.registration_number), v.registration_number;
$$;
revoke all on function public.find_available_vehicles(text,timestamptz,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.find_available_vehicles(text,timestamptz,timestamptz,uuid) to service_role;
