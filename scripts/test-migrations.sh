#!/usr/bin/env bash
# Smoke-tests supabase/migrations + seed.sql against a scratch local
# Postgres database. Requires a local `postgres` superuser reachable via
# `psql` (peer auth). Not a substitute for testing against a real Supabase
# project — see supabase/README.md.
set -euo pipefail

DB=greydigi_migration_test
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

psql -U postgres -c "drop database if exists $DB;"
psql -U postgres -c "create database $DB;"
psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/dev/local_stub_auth.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$f"
done

psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/dev/local_stub_grants.sql"
psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"

echo "OK — migrations and seed applied cleanly to $DB"
