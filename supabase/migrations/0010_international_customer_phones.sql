-- Keep existing Indian identities and accept international E.164 phone numbers.
-- Both public and ops bookings upsert into this table.
begin;
alter table public.customers drop constraint customers_phone_check;
alter table public.customers add constraint customers_phone_check
  check (phone ~ '^\+[1-9][0-9]{6,14}$');
commit;
