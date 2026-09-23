-- Run in a disposable database after migrations 0001–0009. Entire fixture rolls back.
begin;
do $$
declare
  v_vehicle uuid;
  v_booking uuid;
  v_customer uuid;
  v_row record;
  v_count integer;
  v_function regprocedure := 'public.record_admin_booking(uuid,timestamptz,timestamptz,text,text,uuid,text,text,text,numeric,numeric,text)'::regprocedure;
begin
  if has_function_privilege('anon',v_function,'EXECUTE') or has_function_privilege('authenticated',v_function,'EXECUTE') then raise exception 'RPC is exposed to an untrusted role'; end if;
  if not has_function_privilege('service_role',v_function,'EXECUTE') then raise exception 'Service role cannot execute RPC'; end if;
  insert into public.vehicles(registration_number,category_slug,status,day_rate,deposit,is_bookable)
    values('OPS_TEST_001','city-hatchback','maintenance',1234.5,5000,false) returning id into v_vehicle;
  select * into v_row from public.record_admin_booking(v_vehicle,'2035-01-01T10:00:00+05:30','2035-01-02T10:01:00+05:30','approved','ops@example.test',p_phone=>'+919999999991',p_full_name=>'Test Customer');
  if v_row.days <> 2 or v_row.amount_total <> 2469 or v_row.deposit <> 5000 then raise exception 'Quote parity failed: %',v_row; end if;
  v_booking := v_row.booking_id; v_customer := v_row.customer_id;
  if not exists (select 1 from public.bookings where id=v_booking and status='approved' and created_by='ops@example.test') then raise exception 'Audit attribution missing'; end if;
  if not exists (select 1 from public.booking_status_events where booking_id=v_booking and note='Recorded in the ops app') then raise exception 'Status event missing'; end if;
  if exists (select 1 from public.list_bookable_vehicles('2035-03-01','2035-03-02') where id=v_vehicle) then raise exception 'Maintenance car became publicly bookable'; end if;
  begin
    perform * from public.record_admin_booking(v_vehicle,'2035-01-01T12:00:00+05:30','2035-01-02T10:01:00+05:30','confirmed','ops@example.test',p_phone=>'+919999999992');
    raise exception 'Expected overlap rejection';
  exception when raise_exception then
    if sqlerrm <> 'VEHICLE_UNAVAILABLE' then raise; end if;
  end;
  if exists(select 1 from public.customers where phone='+919999999992') then raise exception 'Failed booking created an orphan customer'; end if;
  select * into v_row from public.record_admin_booking(v_vehicle,'2035-01-02T10:01:00+05:30','2035-01-03T10:01:00+05:30','completed','ops@example.test',p_customer_id=>v_customer,p_amount_total=>99,p_deposit=>0);
  if v_row.amount_total <> 99 or v_row.deposit <> 0 or v_row.customer_id <> v_customer then raise exception 'Override or existing customer failed'; end if;
  perform * from public.record_admin_booking(v_vehicle,'2035-02-01','2035-02-02','ongoing','ops@example.test',p_phone=>'+919999999991',p_full_name=>'Updated Name');
  select count(*) into v_count from public.customers where phone='+919999999991';
  if v_count <> 1 then raise exception 'Customer upsert duplicated identity'; end if;
  insert into public.vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) values(v_vehicle,'2035-04-01','2035-04-03','Service','ops@example.test');
  begin
    perform * from public.record_admin_booking(v_vehicle,'2035-04-01','2035-04-02','approved','ops@example.test',p_customer_id=>v_customer);
    raise exception 'Expected block rejection';
  exception when raise_exception then if sqlerrm <> 'VEHICLE_UNAVAILABLE' then raise; end if; end;
  begin
    perform * from public.record_admin_booking(v_vehicle,'2035-06-01','2035-06-02','requested','ops@example.test',p_customer_id=>v_customer);
    raise exception 'Expected invalid-status rejection';
  exception when raise_exception then if sqlerrm <> 'ILLEGAL_TRANSITION' then raise; end if; end;
end;
$$;
-- Force a failure after the customer upsert to prove transaction rollback, not
-- merely validation before the upsert.
create function public.ops_test_reject_insert() returns trigger language plpgsql as $$
begin if new.notes='ops-test-fail-after-upsert' then raise exception 'TEST_INSERT_FAILURE'; end if; return new; end; $$;
create trigger ops_test_reject before insert on public.bookings for each row execute function public.ops_test_reject_insert();
do $$ declare v uuid; begin
  select id into v from public.vehicles where registration_number='OPS_TEST_001';
  begin
    perform * from public.record_admin_booking(v,'2035-07-01','2035-07-02','approved','ops@example.test',p_phone=>'+919999999993',p_notes=>'ops-test-fail-after-upsert');
    raise exception 'Expected forced insert failure';
  exception when raise_exception then if sqlerrm <> 'TEST_INSERT_FAILURE' then raise; end if; end;
  if exists(select 1 from public.customers where phone='+919999999993') then raise exception 'Customer was not rolled back with failed booking'; end if;
end; $$;
rollback;
