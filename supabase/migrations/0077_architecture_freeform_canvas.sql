-- Solution architecture, take two: the user's own explicit choice
-- earlier this session was "keep the column skeleton, no freeform
-- canvas" -- now reversed to a real Figma-style canvas where every
-- module can be dragged to any position. Columns stay as a purely
-- visual reference band behind the canvas (still useful context, per
-- the source deck's own layout) but no longer constrain where a node
-- can sit.
--
-- Real logo images (not just an emoji) are stored as a data URI
-- directly on the row, not in a Storage bucket -- these are small
-- (capped client-side), and a bucket would mean either a public
-- bucket (one more thing to explain) or a signed URL that expires
-- mid-session on a canvas that renders many of them at once. A data
-- URI has neither problem.

begin;

alter table project_architecture_nodes
  add column if not exists pos_x real,
  add column if not exists pos_y real,
  add column if not exists icon_image_url text;

alter table project_architecture_columns
  add column if not exists icon_image_url text;

create table if not exists project_architecture_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  body text not null default '',
  color_hex text not null default '#FBF1E3',
  pos_x real not null default 0,
  pos_y real not null default 0,
  width real not null default 200,
  height real not null default 120,
  created_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_arch_notes_project on project_architecture_notes(project_id);

alter table project_architecture_notes enable row level security;

drop policy if exists project_architecture_notes_read on project_architecture_notes;
create policy project_architecture_notes_read on project_architecture_notes
  for select using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_architecture_notes_write on project_architecture_notes;
create policy project_architecture_notes_write on project_architecture_notes
  for all using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

commit;
