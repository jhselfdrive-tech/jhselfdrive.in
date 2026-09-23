-- Phase 8: push notifications to the operator's phone.
--   * admin_devices  — one row per installed app, holding its APNs token
--   * admin_notifications — the send log, and the dedup guard that stops a
--     30-minute cron re-notifying the same overdue car forever

-- ---------------------------------------------------------------------------
-- 1. Registered devices
-- ---------------------------------------------------------------------------

create table if not exists public.admin_devices (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  -- APNs device token, hex. Unique so re-registering the same phone updates
  -- rather than accumulating rows.
  apns_token text unique not null check (apns_token ~ '^[0-9a-fA-F]{64,200}$'),
  environment text not null default 'production' check (environment in ('sandbox', 'production')),
  app_version text,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists admin_devices_email_idx on public.admin_devices(admin_email);

alter table public.admin_devices enable row level security;
revoke all on public.admin_devices from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Notification log / dedup
-- ---------------------------------------------------------------------------

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  -- Stable identity for the thing being reported. The unique constraint is the
  -- dedup: the scheduler runs every 30 minutes and must not re-send.
  --   request:<bookingId>        overdue:<bookingId>:<date>
  --   unsent:<messageId>         pickups:<date>
  dedupe_key text unique not null check (length(dedupe_key) between 1 and 160),
  kind text not null check (kind in ('request', 'unsent', 'overdue', 'pickups')),
  booking_id uuid references public.bookings(id) on delete cascade,
  title text not null,
  body text not null,
  badge integer,
  device_count integer not null default 0 check (device_count >= 0),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_created_idx on public.admin_notifications(created_at desc);

alter table public.admin_notifications enable row level security;
revoke all on public.admin_notifications from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Scheduler
--
-- Lives here rather than in vercel.json because Vercel's Hobby cron is
-- daily-only and the unsent-message check needs 30-minute granularity.
--
-- Run the schedule block below ONCE, after replacing the two placeholders.
-- It is left commented out so applying this migration cannot post to the
-- wrong host or leak a secret into the migration history.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- select cron.schedule(
--   'jh-ops-push',
--   '*/30 * * * *',
--   $$
--     select net.http_post(
--       -- www, not the bare domain: jhselfdrive.in returns a 308 to www and
--       -- pg_net does not follow redirects, so the job would look scheduled
--       -- and silently never reach the route.
--       url := 'https://www.jhselfdrive.in/api/ops/cron',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-ops-cron-secret', '<OPS_CRON_SECRET>'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
--
-- Check it afterwards with:
--   select jobid, jobname, schedule from cron.job;
--   select status_code, content from net._http_response order by created desc limit 5;
--
-- Remove it with:
--   select cron.unschedule('jh-ops-push');
