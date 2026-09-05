#!/usr/bin/env bash
# Runs supabase/seed_nk_live.sql against your real Supabase database.
# Safe to run more than once -- see the comment at the top of that file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed. On macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL first -- it's a Postgres connection string, not the" >&2
  echo "NEXT_PUBLIC_SUPABASE_URL / keys already in .env.local (those are for" >&2
  echo "the app's REST API, this needs a direct Postgres connection)." >&2
  echo >&2
  echo "Find it in Supabase: Project Settings -> Database -> Connection string" >&2
  echo "-> URI (the pooler/\"Transaction\" mode string works fine). Then:" >&2
  echo >&2
  echo "  DATABASE_URL='postgresql://postgres.xxxx:PASSWORD@...supabase.com:6543/postgres' npm run seed" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed_nk_live.sql"
echo "OK -- seed_nk_live.sql applied."
