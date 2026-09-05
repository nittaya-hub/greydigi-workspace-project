-- Product / Internal Development space.

create table products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index products_workspace_idx on products (workspace_id);

create table releases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  code text not null,
  name text not null,
  target_date date,
  readiness_pct int not null default 0 check (readiness_pct between 0 and 100),
  status release_status not null default 'planning',
  created_at timestamptz not null default now(),
  unique (product_id, code)
);

create index releases_product_idx on releases (product_id);

create table roadmap_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  ref text not null,
  title text not null,
  kind roadmap_item_kind not null,
  status roadmap_item_status not null default 'forecast',
  quarter text,
  release_id uuid references releases (id) on delete set null,
  owner_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, ref)
);

create index roadmap_items_product_idx on roadmap_items (product_id);
create index roadmap_items_release_idx on roadmap_items (release_id);

-- A delivery project may depend on a product release (architecture doc
-- section 5). Kept as its own table (not cross_space_links) because the
-- dependency carries delivery-specific readiness context on screen E.
create table project_release_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  release_id uuid not null references releases (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (project_id, release_id)
);

-- One person can carry delivery tasks, product features and hypercare
-- incidents at once (screen "Engineering" — the only screen showing all
-- three together). This row represents the product-space allocation only;
-- delivery/hypercare load is read live from project_tasks / incidents.
create table engineering_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  ref text not null,
  title text not null,
  roadmap_item_id uuid references roadmap_items (id) on delete set null,
  release_id uuid references releases (id) on delete set null,
  status task_status not null default 'idle',
  created_at timestamptz not null default now(),
  unique (workspace_id, ref)
);

create index engineering_tasks_person_idx on engineering_tasks (person_id);
