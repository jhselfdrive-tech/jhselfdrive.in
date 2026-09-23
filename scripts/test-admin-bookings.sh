#!/usr/bin/env bash
# Isolated PostgreSQL integration checks; never connects to the project's database.
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN=${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}
[ -x "$PG_BIN/postgres" ] || { echo 'Set PG_BIN to a PostgreSQL installation with pgcrypto and btree_gist.'; exit 1; }
TEST_ROOT=$(mktemp -d /tmp/jh-ops-pg.XXXXXX)
cleanup() { "$PG_BIN/pg_ctl" -D "$TEST_ROOT/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TEST_ROOT"; }
trap cleanup EXIT
"$PG_BIN/initdb" -D "$TEST_ROOT/data" -A trust -U postgres >/dev/null
"$PG_BIN/pg_ctl" -D "$TEST_ROOT/data" -l "$TEST_ROOT/server.log" -o "-h '' -k $TEST_ROOT -p 55439" start >/dev/null
PSQL=("$PG_BIN/psql" -h "$TEST_ROOT" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1)
"${PSQL[@]}" >/dev/null <<'SQL'
create role anon; create role authenticated; create role service_role bypassrls;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
SQL
for migration in supabase/migrations/*.sql; do
  # Supabase's scheduler extensions are unrelated to booking transactions and
  # are not distributed with vanilla PostgreSQL. Keep every other statement.
  sed -E '/^create extension if not exists (pg_cron|pg_net)/d' "$migration" > "$TEST_ROOT/current.sql"
  "${PSQL[@]}" -f "$TEST_ROOT/current.sql" >"$TEST_ROOT/migration.log" 2>&1 || { cat "$TEST_ROOT/migration.log"; exit 1; }
done
"${PSQL[@]}" -f supabase/tests/admin_bookings.sql
# Two independent sessions compete for exactly the same vehicle/window.
"${PSQL[@]}" -c "insert into vehicles(id,registration_number,category_slug,day_rate,deposit) values('00000000-0000-4000-8000-000000000001','RACE_TEST','city-hatchback',1000,5000)" >/dev/null
race() { "${PSQL[@]}" -c "select * from record_admin_booking('00000000-0000-4000-8000-000000000001','2036-01-01','2036-01-02','approved','ops@example.test',p_phone=>'+91999999999$1');" >"$TEST_ROOT/race-$1.log" 2>&1; }
race 4 & FIRST=$!
race 5 & SECOND=$!
FIRST_RESULT=0; SECOND_RESULT=0
wait "$FIRST" || FIRST_RESULT=$?
wait "$SECOND" || SECOND_RESULT=$?
[ "$FIRST_RESULT" -ne "$SECOND_RESULT" ] || { cat "$TEST_ROOT"/race-*.log; echo 'Expected exactly one successful concurrent booking'; exit 1; }
[ "$("${PSQL[@]}" -Atc "select count(*) from bookings where vehicle_id='00000000-0000-4000-8000-000000000001'")" = 1 ] || exit 1
[ "$("${PSQL[@]}" -Atc "select count(*) from customers where phone in ('+919999999994','+919999999995')")" = 1 ] || exit 1
echo 'Admin booking migration, rollback, grants, overlap and concurrency checks passed.'
