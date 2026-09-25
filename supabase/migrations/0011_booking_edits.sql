-- Serialize reservations and maintenance against the vehicle, including older writers.
create or replace function public.guard_vehicle_reservation() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.vehicle_id is null then return new; end if;
  perform 1 from public.vehicles where id = new.vehicle_id for update;
  if tg_table_name = 'bookings' then
    if new.status in ('approved','confirmed','ongoing','completed') and exists (
      select 1 from public.vehicle_blocks where vehicle_id = new.vehicle_id
      and start_at < new.end_at and end_at > new.start_at
    ) then raise exception 'VEHICLE_UNAVAILABLE'; end if;
  else
    if exists (select 1 from public.bookings where vehicle_id = new.vehicle_id
      and status in ('approved','confirmed','ongoing','completed')
      and start_at < new.end_at and end_at > new.start_at
    ) then raise exception 'VEHICLE_BOOKED'; end if;
  end if;
  return new;
end;
$$;
create trigger bookings_guard_blocks before insert or update of vehicle_id,start_at,end_at,status on public.bookings
for each row execute function public.guard_vehicle_reservation();
create trigger blocks_guard_bookings before insert or update of vehicle_id,start_at,end_at on public.vehicle_blocks
for each row execute function public.guard_vehicle_reservation();

create or replace function public.update_admin_booking(
  p_booking_id uuid, p_actor text, p_start_at timestamptz default null,
  p_end_at timestamptz default null, p_vehicle_id uuid default null,
  p_customer_id uuid default null, p_amount_total numeric default null,
  p_deposit numeric default null, p_notes text default null, p_set_notes boolean default false
) returns void language plpgsql security invoker set search_path = public as $$
declare
  old public.bookings%rowtype;
  edited public.bookings%rowtype;
  changes text[] := array[]::text[];
begin
  select * into old from public.bookings where id = p_booking_id for update;
  if old.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if old.status in ('cancelled','rejected') then raise exception 'BOOKING_LOCKED'; end if;
  if nullif(trim(p_actor),'') is null then raise exception 'Actor is required'; end if;
  edited := old;
  edited.start_at := coalesce(p_start_at,old.start_at);
  edited.end_at := coalesce(p_end_at,old.end_at);
  edited.vehicle_id := coalesce(p_vehicle_id,old.vehicle_id);
  edited.customer_id := coalesce(p_customer_id,old.customer_id);
  edited.amount_total := coalesce(p_amount_total,old.amount_total);
  edited.deposit := coalesce(p_deposit,old.deposit);
  if p_set_notes then edited.notes := nullif(trim(p_notes),''); end if;
  if not isfinite(edited.start_at) or not isfinite(edited.end_at) or edited.end_at <= edited.start_at then
    raise exception 'INVALID_HANDOVER_RANGE';
  end if;
  if edited.vehicle_id is not null then
    perform 1 from public.vehicles where id = edited.vehicle_id for update;
    if not found then raise exception 'VEHICLE_NOT_FOUND'; end if;
    if edited.status in ('approved','confirmed','ongoing','completed') and not exists (
      select 1 from public.find_available_vehicles(null,edited.start_at,edited.end_at,p_booking_id) where id = edited.vehicle_id
    ) then raise exception 'VEHICLE_UNAVAILABLE'; end if;
  end if;
  if not exists (select 1 from public.customers where id = edited.customer_id) then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  if edited.start_at is distinct from old.start_at or edited.end_at is distinct from old.end_at then changes := array_append(changes,'dates'); end if;
  if edited.vehicle_id is distinct from old.vehicle_id then
    select category_slug into edited.car_slug from public.vehicles where id = edited.vehicle_id;
    changes := array_append(changes,'vehicle');
  end if;
  if edited.customer_id is distinct from old.customer_id then changes := array_append(changes,'customer'); end if;
  if edited.amount_total is distinct from old.amount_total then changes := array_append(changes,format('amount (₹%s → ₹%s)',old.amount_total,edited.amount_total)); end if;
  if edited.deposit is distinct from old.deposit then changes := array_append(changes,format('deposit (₹%s → ₹%s)',old.deposit,edited.deposit)); end if;
  if edited.notes is distinct from old.notes then changes := array_append(changes,'notes'); end if;
  if cardinality(changes) = 0 then return; end if;
  update public.bookings set start_at=edited.start_at,end_at=edited.end_at,vehicle_id=edited.vehicle_id,
    car_slug=edited.car_slug,customer_id=edited.customer_id,amount_total=edited.amount_total,
    deposit=edited.deposit,notes=edited.notes where id=p_booking_id;
  insert into public.booking_status_events(booking_id,from_status,to_status,note,created_by)
    values(p_booking_id,old.status,old.status,'Edited: ' || array_to_string(changes,', '),p_actor);
end;
$$;
revoke all on function public.update_admin_booking(uuid,text,timestamptz,timestamptz,uuid,uuid,numeric,numeric,text,boolean) from public,anon,authenticated;
grant execute on function public.update_admin_booking(uuid,text,timestamptz,timestamptz,uuid,uuid,numeric,numeric,text,boolean) to service_role;
