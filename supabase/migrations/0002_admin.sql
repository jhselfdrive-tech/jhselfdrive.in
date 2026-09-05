create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(email)),
  full_name text,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  enquiry_id uuid unique references public.enquiries(id) on delete set null,
  car_slug text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  amount_total numeric(10,2) not null check (amount_total >= 0),
  deposit numeric(10,2) not null default 0 check (deposit >= 0),
  deposit_returned boolean not null default false,
  status text not null default 'confirmed' check (status in ('confirmed', 'ongoing', 'completed', 'cancelled')),
  notes text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index admin_users_email_idx on public.admin_users(email);
create index bookings_customer_id_idx on public.bookings(customer_id);
create index bookings_status_idx on public.bookings(status);
create index bookings_start_date_idx on public.bookings(start_date desc);

alter table public.admin_users enable row level security;
alter table public.bookings enable row level security;
revoke all on public.admin_users, public.bookings from anon, authenticated;

create or replace view public.customer_stats
with (security_invoker = true)
as
select
  c.id,
  c.phone,
  c.full_name,
  c.email,
  c.city,
  c.enquiry_count,
  c.first_seen_at,
  c.last_seen_at,
  c.tags,
  c.notes,
  count(b.id)::integer as booking_count,
  count(b.id) filter (where b.status = 'completed')::integer as completed_booking_count,
  coalesce(sum(b.amount_total) filter (where b.status = 'completed'), 0)::numeric(12,2) as lifetime_value,
  max(b.created_at) as last_booking_at
from public.customers c
left join public.bookings b on b.customer_id = c.id
group by c.id;

revoke all on public.customer_stats from anon, authenticated;

create or replace function public.create_booking_from_enquiry(
  p_enquiry_id uuid,
  p_car_slug text,
  p_start_date date,
  p_end_date date,
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
  select customer_id into v_customer_id
  from public.enquiries
  where id = p_enquiry_id
  for update;

  if v_customer_id is null then
    raise exception using errcode = 'P0002', message = 'ENQUIRY_NOT_FOUND';
  end if;

  insert into public.bookings (
    customer_id, enquiry_id, car_slug, start_date, end_date,
    amount_total, deposit, status, notes, created_by
  ) values (
    v_customer_id, p_enquiry_id, p_car_slug, p_start_date, p_end_date,
    p_amount_total, p_deposit, p_status, nullif(p_notes, ''), p_created_by
  ) returning id into v_booking_id;

  update public.enquiries set status = 'converted' where id = p_enquiry_id;
  return v_booking_id;
end;
$$;

revoke all on function public.create_booking_from_enquiry(uuid, text, date, date, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking_from_enquiry(uuid, text, date, date, numeric, numeric, text, text, text) to service_role;
