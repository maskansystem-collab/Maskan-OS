#!/usr/bin/env bash
#
# Applies every migration to a throwaway local Postgres and runs the RLS
# access matrix against it.
#
#   tools/rls-test.sh
#
# Needs a Postgres 16 server binary on the machine; nothing is sent to any
# Supabase project, and no existing database is touched. Supabase's own
# auth and storage schemas are stubbed, since the migrations reference
# auth.uid() and storage.objects but do not create them.
#
# Why this is a separate script rather than a vitest case: the faults it
# catches only appear for a non-superuser with a JWT subject set. The
# application's own client bypasses RLS whenever it uses the service-role
# key, so no test run through the app can see them.

set -euo pipefail

cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGPORT="${PGPORT:-55432}"
DB="rls_test_$$"

if [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "No Postgres server at $PGBIN. Set PGBIN, or install postgresql-16." >&2
  exit 2
fi

if ! pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null; then
  echo "No server on 127.0.0.1:$PGPORT. Start one, for example:" >&2
  echo "  $PGBIN/initdb -D /tmp/pgdata -U postgres --auth=trust" >&2
  echo "  $PGBIN/pg_ctl -D /tmp/pgdata -o '-p $PGPORT -c unix_socket_directories=/tmp' start" >&2
  exit 2
fi

PSQL=(psql -h 127.0.0.1 -p "$PGPORT" -U postgres -q -v ON_ERROR_STOP=1)

cleanup() {
  psql -h 127.0.0.1 -p "$PGPORT" -U postgres -q --set AUTOCOMMIT=on \
    -c "drop database if exists $DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -q --set AUTOCOMMIT=on -c "create database $DB"

# Stand-ins for the Supabase-managed objects the migrations reference.
"${PSQL[@]}" -d "$DB" <<'SQL'
create schema if not exists auth;
create schema if not exists storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb
);
SQL

for f in supabase/migrations/*.sql; do
  if ! out=$("${PSQL[@]}" -d "$DB" -f "$f" 2>&1); then
    echo "Migration failed: $(basename "$f")" >&2
    echo "$out" >&2
    exit 1
  fi
done

echo "All $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migrations applied."
psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d "$DB" -f supabase/tests/rls-access-matrix.sql
