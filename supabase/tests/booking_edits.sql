begin;
do $$
declare v uuid; v2 uuid; c uuid; b uuid; other uuid; block uuid; f regprocedure := 'public.update_admin_booking(uuid,text,timestamptz,timestamptz,uuid,uuid,numeric,numeric,text,boolean)'::regprocedure;
begin
  if has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') then raise exception 'Edit RPC exposed'; end if;
  if not has_function_privilege('service_role',f,'EXECUTE') then raise exception 'Edit RPC unavailable'; end if;
  insert into vehicles(registration_number,category_slug,day_rate,deposit) values('EDIT_ONE','hatchback',2000,1000) returning id into v;
  insert into vehicles(registration_number,category_slug,day_rate,deposit) values('EDIT_TWO','suv',4000,2000) returning id into v2;
  select booking_id,customer_id into b,c from record_admin_booking(v,'2037-01-01','2037-01-03','approved','test@example.test',p_phone=>'+971501801938',p_notes=>'Keep me');
  select booking_id into other from record_admin_booking(v,'2037-01-04','2037-01-06','confirmed','test@example.test',p_customer_id=>c);
  begin
    perform update_admin_booking(b,'test@example.test',p_end_at=>'2037-01-05'); raise exception 'Clash accepted';
  exception when raise_exception then if sqlerrm <> 'VEHICLE_UNAVAILABLE' then raise; end if; end;
  perform update_admin_booking(b,'test@example.test',p_start_at=>'2037-01-07',p_end_at=>'2037-01-09',p_amount_total=>6000);
  if not exists(select 1 from bookings where id=b and notes='Keep me' and amount_total=6000 and end_at='2037-01-09') then raise exception 'Edit or omission failed'; end if;
  if not exists(select 1 from booking_status_events where booking_id=b and from_status=to_status and note like 'Edited: dates, amount%') then raise exception 'Edit audit missing'; end if;
  begin
    perform update_admin_booking(b,'test@example.test',p_end_at=>'2037-01-01'); raise exception 'Invalid merged dates accepted';
  exception when raise_exception then if sqlerrm <> 'INVALID_HANDOVER_RANGE' then raise; end if; end;
  perform update_admin_booking(b,'test@example.test',p_vehicle_id=>v2,p_deposit=>0,p_notes=>'',p_set_notes=>true);
  if not exists(select 1 from bookings where id=b and car_slug='suv' and vehicle_id=v2 and notes is null and deposit=0) then raise exception 'Vehicle, clearing notes or zero failed'; end if;
  update bookings set status='cancelled' where id=b;
  begin
    perform update_admin_booking(b,'test@example.test',p_notes=>'Forbidden',p_set_notes=>true); raise exception 'Locked edit accepted';
  exception when raise_exception then if sqlerrm <> 'BOOKING_LOCKED' then raise; end if; end;
  begin
    perform update_admin_booking(gen_random_uuid(),'test@example.test',p_notes=>'Absent'); raise exception 'Missing edit accepted';
  exception when raise_exception then if sqlerrm <> 'BOOKING_NOT_FOUND' then raise; end if; end;
  insert into vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) values(v,'2037-02-01','2037-02-02','Maintenance','test@example.test') returning id into block;
  begin
    update vehicle_blocks set start_at='2037-01-04',end_at='2037-01-05' where id=block; raise exception 'Block overlap accepted';
  exception when raise_exception then if sqlerrm <> 'VEHICLE_BOOKED' then raise; end if; end;
  -- Even old direct writers respect maintenance and approved reservations.
  update bookings set status='approved' where id=other;
  begin
    insert into vehicle_blocks(vehicle_id,start_at,end_at,reason,created_by) values(v,'2037-01-04','2037-01-05','Maintenance','test@example.test'); raise exception 'Approved overlap accepted';
  exception when raise_exception then if sqlerrm <> 'VEHICLE_BOOKED' then raise; end if; end;
  begin
    update bookings set start_at='2037-02-01',end_at='2037-02-02' where id=other; raise exception 'Direct writer ignored block';
  exception when raise_exception then if sqlerrm <> 'VEHICLE_UNAVAILABLE' then raise; end if; end;
  update vehicle_blocks set start_at='2037-01-06',end_at='2037-01-07' where id=block;
end; $$;
rollback;
