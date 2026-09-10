-- Checkpoint history archive: once a week's reviewed Checkpoint data
-- (project_progress_stats/decisions/weekly_commitments/baseline_measures,
-- see 0054_checkpoint_sections.sql) has been used in the client view, a
-- "Publish to history" action freezes a copy of it here. Deliberately
-- has NO update or delete policy at all -- once a row exists, nothing
-- (not even a workspace_admin) can change or remove it from inside this
-- app. That is the actual enforcement mechanism behind "เปลี่ยน ลบไม่ได้
-- เมื่อ publish ไปแล้ว" (can't be edited or deleted once published), not
-- just a UI restriction that a direct API/SQL call could bypass.
create table project_checkpoint_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  week_label text not null,
  published_at timestamptz not null default now(),
  published_by uuid references people (id) on delete set null,
  snapshot jsonb not null
);
create index project_checkpoint_snapshots_project_idx on project_checkpoint_snapshots (project_id, published_at);

alter table project_checkpoint_snapshots enable row level security;
create policy project_checkpoint_snapshots_read on project_checkpoint_snapshots for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_checkpoint_snapshots_insert on project_checkpoint_snapshots for insert
  with check (project_id in (select fn_my_admin_project_ids()));
