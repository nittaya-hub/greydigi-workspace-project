-- Workspace branding: colors/fonts/logo/PDF template, sourced from an
-- uploaded design-tokens package (a .skill file, e.g. greydigi-design —
-- a real W3C Design Tokens Format JSON at assets/tokens.json, plus a
-- logo image and an HTML template under assets/templates/). Server-side
-- PDF/Excel export code reads this row, not "a Claude skill" at
-- runtime — a deployed app has no mechanism to invoke a Claude Code
-- skill, so the skill package is treated purely as a data source here,
-- parsed once on upload and stored like any other asset.
create table workspace_branding (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces (id) on delete cascade,
  tokens jsonb not null default '{}'::jsonb,
  logo_data_url text,
  logo_filename text,
  html_template text,
  source_filename text,
  updated_at timestamptz not null default now(),
  updated_by uuid references people (id) on delete set null
);

alter table workspace_branding enable row level security;

-- Read: any internal person — export code run on any person's behalf
-- needs this, not just admins.
create policy workspace_branding_read on workspace_branding for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

-- Write: admin only, matching Portal/branding's existing admin-only
-- settings pages.
create policy workspace_branding_write on workspace_branding for all
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin())
  with check (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());
