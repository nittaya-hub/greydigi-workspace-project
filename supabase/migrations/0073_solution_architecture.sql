-- "REFERENCE · SOLUTION ARCHITECTURE" -- a per-project, hand-maintained
-- column-swimlane diagram (deck page 12: "Shopify to Supabase, and
-- where personal data stops"). Internal reference only -- the source
-- deck marks this page "REFERENCE · NOT WALKED THROUGH ... CONFIDENTIAL",
-- so unlike Checkpoint data this never crosses into client_view_configs
-- or the client portal. Column structure is fixed in the sense that a
-- diagram is always organized as columns left to right, but the
-- columns themselves (how many, their labels/icons) are fully
-- editable per project, since every client's architecture differs.

begin;

create table if not exists project_architecture_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  icon text,
  color_hex text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_architecture_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  column_id uuid not null references project_architecture_columns(id) on delete cascade,
  label text not null,
  detail text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_architecture_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_node_id uuid not null references project_architecture_nodes(id) on delete cascade,
  to_node_id uuid not null references project_architecture_nodes(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  check (from_node_id <> to_node_id)
);

-- Source Excel/spreadsheet files a diagram was imported from, kept for
-- reference -- same shape and same delivery-documents bucket as
-- checkpoint_source_files (0070), just a second table rather than
-- reusing that one, since these files belong to a different section.
create table if not exists project_architecture_source_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  file_asset_id uuid not null references file_assets(id) on delete cascade,
  uploaded_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_arch_columns_project on project_architecture_columns(project_id);
create index if not exists idx_arch_nodes_project on project_architecture_nodes(project_id);
create index if not exists idx_arch_nodes_column on project_architecture_nodes(column_id);
create index if not exists idx_arch_edges_project on project_architecture_edges(project_id);
create index if not exists idx_arch_edges_from on project_architecture_edges(from_node_id);
create index if not exists idx_arch_edges_to on project_architecture_edges(to_node_id);
create index if not exists idx_arch_source_files_project on project_architecture_source_files(project_id);

alter table project_architecture_columns enable row level security;
alter table project_architecture_nodes enable row level security;
alter table project_architecture_edges enable row level security;
alter table project_architecture_source_files enable row level security;

drop policy if exists project_architecture_columns_read on project_architecture_columns;
create policy project_architecture_columns_read on project_architecture_columns
  for select using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_architecture_columns_write on project_architecture_columns;
create policy project_architecture_columns_write on project_architecture_columns
  for all using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_architecture_nodes_read on project_architecture_nodes;
create policy project_architecture_nodes_read on project_architecture_nodes
  for select using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_architecture_nodes_write on project_architecture_nodes;
create policy project_architecture_nodes_write on project_architecture_nodes
  for all using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_architecture_edges_read on project_architecture_edges;
create policy project_architecture_edges_read on project_architecture_edges
  for select using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_architecture_edges_write on project_architecture_edges;
create policy project_architecture_edges_write on project_architecture_edges
  for all using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_architecture_source_files_read on project_architecture_source_files;
create policy project_architecture_source_files_read on project_architecture_source_files
  for select using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_architecture_source_files_write on project_architecture_source_files;
create policy project_architecture_source_files_write on project_architecture_source_files
  for all using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

commit;
