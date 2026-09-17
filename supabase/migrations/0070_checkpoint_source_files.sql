-- Lets a team member upload a source document (PDF/PNG, e.g. a dev
-- team's own status deck) against a mission's Checkpoint data tab, so
-- it's kept alongside the numbers it was read from -- real file storage,
-- same delivery-documents bucket and path convention as Missions'
-- Documents tab (0034), just its own small linking table so this stays
-- completely separate from that tab's client-visibility/signature/
-- gate-auto-confirm logic, none of which applies to a raw internal
-- source deck.
--
-- Deliberately NOT built here: automatically reading the file and
-- mapping its content into Build-progress stats / Decisions / This week
-- next week / Baseline measures. That needs a real AI provider call
-- (this workspace has no AI API key configured anywhere today -- grepped
-- the whole codebase for one before writing this) with a real per-call
-- cost, so it stays gated behind an "Integration required" action, the
-- same honest-refusal pattern already used for the agent registry
-- (0066) rather than a half-built pipeline that can't actually run.

create table if not exists checkpoint_source_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  file_asset_id uuid not null references file_assets (id) on delete cascade,
  uploaded_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists checkpoint_source_files_project_idx on checkpoint_source_files (project_id, created_at);

alter table checkpoint_source_files enable row level security;

drop policy if exists checkpoint_source_files_read on checkpoint_source_files;
create policy checkpoint_source_files_read on checkpoint_source_files for select
  using (project_id in (select fn_my_accessible_project_ids()));

drop policy if exists checkpoint_source_files_insert on checkpoint_source_files;
create policy checkpoint_source_files_insert on checkpoint_source_files for insert
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists checkpoint_source_files_delete on checkpoint_source_files;
create policy checkpoint_source_files_delete on checkpoint_source_files for delete
  using (project_id in (select fn_my_admin_project_ids()));
