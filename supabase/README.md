# Database

SQL-first schema for a real Supabase project — this repo does not vendor
the Supabase CLI's local dev stack (`supabase start`, which needs Docker;
unavailable in the environment these were authored in). Migrations were
smoke-tested against a plain local Postgres 16 instead — see `dev/`.

## Set up a real project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` in the `web/` root and fill in the
   Project URL, anon key and service role key (Settings → API).
3. Apply the schema, in order, via the SQL editor or `psql`:
   ```
   for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
   ```
4. Optionally seed a realistic demo portfolio (the same Nutrition
   Kitchen / Halcyon Freight / Beacon Dental / Ridgeline Outdoor data the
   design mockups use):
   ```
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
4b. To load real data for the first live client instead of (or alongside)
   the demo portfolio — the aironauts flight plan as the master template,
   plus the Nutrition Kitchen "Order to procurement" engagement from the
   Phase 1 kickoff deck — run:
   ```
   psql "$DATABASE_URL" -f supabase/seed_nk_live.sql
   ```
   Safe to run on a live/production database and safe to re-run: every
   insert either uses a real unique constraint (`on conflict ... do
   update`) or an explicit find-or-create check, so re-running updates the
   same rows instead of duplicating them. See the comment at the top of
   the file for the placeholder client-contact emails it uses.
5. Regenerate `src/lib/supabase/database.types.ts` from the real schema:
   ```
   SUPABASE_PROJECT_ID=<your-project-ref> npm run supabase:gen-types
   ```
   (`database.types.ts` is currently hand-written to match the migrations
   exactly — regenerating replaces it with the authoritative version.)
6. Invite the first workspace_admin: sign them up via Supabase Auth, then
   insert a matching row in `people` with `auth_user_id` set to their new
   `auth.users.id` (or write a small onboarding trigger to do this
   automatically — not included here since it depends on your invite flow).

## Migrations

Numbered, applied in order:

| File | Contents |
|---|---|
| `0001_extensions_enums.sql` | Extensions and all enum types |
| `0002_core.sql` | Workspace, people, RBAC, clients, notifications, audit log |
| `0003_delivery.sql` | Templates, projects, gates, tasks, baselines, change requests, documents, client updates, client view config, share links, client actions/signatures |
| `0004_product.sql` | Products, releases, roadmap, engineering tasks |
| `0005_hypercare.sql` | Services, SLA, incidents, requests, health, escalations |
| `0006_state_engine.sql` | The one authoritative state/calculation engine — gate status, project health, progress, service health — plus triggers that keep cached columns in sync |
| `0007_rls.sql` | Row Level Security: internal workspace members, client-portal users, and the public boundary |
| `0008_projections.sql` | `fn_publish_client_view`, `fn_public_share_view` (P·1), `fn_client_portal_project` (Q) — the only paths through which client/public code ever reads delivery data |

## `dev/`

`local_stub_auth.sql` and `local_stub_grants.sql` exist only to smoke-test
migrations against a bare Postgres instance that lacks Supabase's `auth`
schema and `anon`/`authenticated` roles. **Never run these against a real
Supabase project** — it already provides all of this. See
`scripts/test-migrations.sh` to reproduce the smoke test locally.
