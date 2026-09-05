-- Workspace core: identity, RBAC, clients, notifications, audit.

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- One canonical person per human, internal or client, referenced (never
-- duplicated) by every space. auth_user_id is null for people who have not
-- been invited to sign in yet.
create table people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  kind person_kind not null,
  avatar_initials text not null,
  workspace_role workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index people_workspace_idx on people (workspace_id);
create index people_auth_user_idx on people (auth_user_id);

-- Space-scoped grant, e.g. a Product lead who is also a Delivery member.
create table space_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people (id) on delete cascade,
  space space_kind not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (person_id, space)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  client_since date,
  logo_url text,
  created_at timestamptz not null default now()
);

create index clients_workspace_idx on clients (workspace_id);

-- Client-portal access: which client(s) a client-kind person may see. A
-- person can be scoped to more than one client engagement.
create table client_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  role text not null default 'client_contact',
  created_at timestamptz not null default now(),
  unique (person_id, client_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  related_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_person_idx on notifications (person_id, is_read);

-- Append-only. Every state transition in the system writes here (architecture
-- doc section 7: "Every state transition must produce an auditable activity
-- record" / section 16: "Every mutation must be traceable").
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  actor_person_id uuid references people (id) on delete set null,
  space space_kind,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_workspace_idx on activity_log (workspace_id, created_at desc);
create index activity_log_entity_idx on activity_log (entity_type, entity_id);

create table file_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Explicit, audited relationships between records that live in different
-- spaces (architecture doc section 5: "Cross-space relationships must be
-- explicit and auditable"). e.g. hypercare incident -> delivery change
-- request, delivery project -> hypercare service, delivery project ->
-- product release dependency.
create table cross_space_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  relationship text not null,
  note text,
  created_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

create index cross_space_links_from_idx on cross_space_links (from_type, from_id);
create index cross_space_links_to_idx on cross_space_links (to_type, to_id);
