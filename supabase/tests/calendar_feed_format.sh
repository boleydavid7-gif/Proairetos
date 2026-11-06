#!/bin/bash
# Checks migration 20261111000000_calendar_feed_format.sql against a scratch Postgres 16 (a throwaway cluster, never Supabase).
# Stubs `auth` as the other migration checks do. Needs the postgres user (run as root) and the Postgres 16 binaries.
#   bash supabase/tests/calendar_feed_format.sh
set -u
cd "$(dirname "$0")/../.."
BIN=/usr/lib/postgresql/16/bin
DIR=${PGTEST_DIR:-/tmp/pgcal}
PORT=${PGTEST_PORT:-54329}
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b
pass=0; fail=0
as() { runuser -u postgres -- "$@"; }
q() { as psql -X -q -At -h "$DIR" -p "$PORT" -d cal "$@"; }
check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS  $1"; else fail=$((fail+1)); echo "FAIL  $1  (got '$2', wanted '$3')"; fi; }
refused() { grep -q "row-level security" <<<"$1" && echo yes || echo no; }

rm -rf "$DIR"; mkdir -p "$DIR"; chown postgres "$DIR"
as $BIN/initdb -D "$DIR/data" -A trust >/dev/null
as $BIN/pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" -w start >/dev/null
trap 'as $BIN/pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR"' EXIT
as createdb -h "$DIR" -p "$PORT" cal

q <<SQL
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
create role authenticated nologin; create role anon nologin;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
insert into auth.users values ('$A'), ('$B');
SQL
q < supabase/migrations/20261002000000_calendar_feed.sql
q -c "grant select, insert, update, delete on public.calendar_feeds to authenticated;"
q <<SQL
insert into public.calendar_feeds (user_id, token, ics) values
  ('$A', repeat('a', 43), 'SUMMARY:Internet · \$78.24 DESCRIPTION:Confirmation ABC123'),
  ('$B', repeat('b', 43), 'SUMMARY:Busy');
SQL
check "before: two old feeds, no format column" "$(q -c "select count(*) from public.calendar_feeds") $(q -c "select count(*) from information_schema.columns where table_name='calendar_feeds' and column_name='format'")" "2 0"

# 1. A migration that fails part-way changes nothing (one transaction).
( sed '/^commit;/d' supabase/migrations/20261111000000_calendar_feed_format.sql; echo "select 1/0;"; echo "commit;" ) | q -v ON_ERROR_STOP=1 >/dev/null 2>&1
check "a failure part-way rolls everything back: rows kept" "$(q -c "select count(*) from public.calendar_feeds")" "2"
check "a failure part-way rolls everything back: no format column" "$(q -c "select count(*) from information_schema.columns where table_name='calendar_feeds' and column_name='format'")" "0"
check "a failure part-way rolls everything back: old policy kept" "$(q -c "select count(*) from pg_policies where tablename='calendar_feeds' and with_check like '%format%'")" "0"

# 2. The migration itself.
q -v ON_ERROR_STOP=1 < supabase/migrations/20261111000000_calendar_feed_format.sql >/dev/null 2>&1
check "migration succeeds: every old row is gone" "$(q -c "select count(*) from public.calendar_feeds")" "0"
check "migration: format column exists" "$(q -c "select count(*) from information_schema.columns where table_name='calendar_feeds' and column_name='format'")" "1"
check "migration: writes need format 2" "$(q -c "select count(*) from pg_policies where tablename='calendar_feeds' and with_check like '%format = 2%'")" "1"

# 3. What a signed-in person can and cannot do afterwards.
as_user() { local who=$1; shift; q -v ON_ERROR_STOP=1 -c "set role authenticated" -c "select set_config('request.jwt.claim.sub','$who',false)" "$@" 2>&1; }
T1=$(printf 'n%.0s' {1..43}); T2=$(printf 'm%.0s' {1..43})
out=$(as_user $A -c "insert into public.calendar_feeds (user_id, token, ics) values ('$A','$T1','old style')")
check "an older client (no format) cannot write a file" "$(refused "$out")" "yes"
out=$(as_user $A -c "insert into public.calendar_feeds (user_id, token, ics, format) values ('$A','$T1','SUMMARY:Busy', 1)")
check "a file marked with another format is refused" "$(refused "$out")" "yes"
out=$(as_user $A -c "insert into public.calendar_feeds (user_id, token, ics, format) values ('$A','$T1','SUMMARY:Busy', 2)")
check "the corrected client can write format 2" "$(refused "$out")" "no"
out=$(as_user $A -c "insert into public.calendar_feeds (user_id, token, ics, format) values ('$A','$T2','SUMMARY:Busy', 2) on conflict (user_id) do update set token = excluded.token, ics = excluded.ics, format = excluded.format, updated_at = now()")
check "a new link (upsert with format 2) replaces the token" "$(q -c "select token = '$T2' from public.calendar_feeds where user_id = '$A'")" "t"
out=$(as_user $A -c "update public.calendar_feeds set format = null where user_id = '$A'")
check "a row cannot be set back to no format" "$(refused "$out")" "yes"
out=$(as_user $A -c "update public.calendar_feeds set ics = 'SUMMARY:Busy again', format = 2 where user_id = '$A' and token = '$T2' and format = 2 returning token")
check "a refresh of the file (format 2) works" "$(grep -c "$T2" <<<"$out")" "1"
check "another person sees none of it" "$(as_user $B -c "select count(*) from public.calendar_feeds" | tail -1)" "0"
check "another person cannot change it" "$(as_user $B -c "update public.calendar_feeds set ics = 'x', format = 2 where user_id = '$A' returning 1" | grep -c '^1$')" "0"
out=$(q -c "set role anon" -c "select count(*) from public.calendar_feeds" 2>&1)
check "a visitor with no sign-in cannot read the table" "$(grep -c 'permission denied' <<<"$out")" "1"

# 4. What the function asks (token and format 2), as the service role: an old row is never returned.
q -c "insert into public.calendar_feeds (user_id, token, ics, format) values ('$B', '$(printf 'o%.0s' {1..43})', 'OLD CONTENT', null)" >/dev/null 2>&1
check "the function's query returns nothing for an old-format row" "$(q -c "select count(*) from public.calendar_feeds where token = '$(printf 'o%.0s' {1..43})' and format = 2")" "0"
check "the function's query returns a format 2 file" "$(q -c "select count(*) from public.calendar_feeds where token = '$T2' and format = 2")" "1"

# 5. Running it again keeps new files and removes any old row.
q -v ON_ERROR_STOP=1 < supabase/migrations/20261111000000_calendar_feed_format.sql >/dev/null 2>&1
check "a second run keeps format 2 files" "$(q -c "select count(*) from public.calendar_feeds where format = 2")" "1"
check "a second run removes an old row" "$(q -c "select count(*) from public.calendar_feeds where format is distinct from 2")" "0"

echo; echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
