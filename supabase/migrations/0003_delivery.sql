-- Delivery space: the flight-plan methodology engine and everything a
-- client engagement carries. Architecture doc section 6 ("Flight Plan
-- methodology engine") and section 10 (project navigation to preserve).

-- Template: immutable Version -> Phases -> Gates -> Gate conditions ->
-- Template tasks. A project clones a version; editing the template never
-- moves work already in flight (architecture doc section 6, 16).
create table templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates (id) on delete cascade,
  version text not null,
  is_locked boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table template_phases (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references template_versions (id) on delete cascade,
  index int not null,
  code text not null,
  name text not null,
  unique (template_version_id, index)
);

create table template_gates (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references template_versions (id) on delete cascade,
  template_phase_id uuid not null references template_phases (id) on delete cascade,
  code text not null,
  name text not null,
  sequence int not null,
  unique (template_version_id, code)
);

create table template_gate_conditions (
  id uuid primary key default gen_random_uuid(),
  template_gate_id uuid not null references template_gates (id) on delete cascade,
  description text not null,
  requires_signature boolean not null default false,
  sequence int not null
);

create table template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references template_versions (id) on delete cascade,
  template_phase_id uuid not null references template_phases (id) on delete cascade,
  title text not null,
  is_critical_path boolean not null default false
);

-- A project holds a versioned copy of the flight plan it cloned, so a
-- template edit after clone never moves work already in flight.
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  client_id uuid not null references clients (id) on delete restrict,
  ref text not null,
  name text not null,
  description text,
  template_version_id uuid references template_versions (id) on delete set null,
  status project_status not null default 'active',
  lead_person_id uuid references people (id) on delete set null,
  go_live_target date,
  created_at timestamptz not null default now(),
  unique (workspace_id, ref)
);

create index projects_workspace_idx on projects (workspace_id);
create index projects_client_idx on projects (client_id);

create table project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  template_phase_id uuid references template_phases (id) on delete set null,
  index int not null,
  code text not null,
  name text not null,
  started_at timestamptz,
  completed_at timestamptz,
  unique (project_id, index)
);

create index project_phases_project_idx on project_phases (project_id);

create table project_gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  project_phase_id uuid not null references project_phases (id) on delete cascade,
  template_gate_id uuid references template_gates (id) on delete set null,
  code text not null,
  name text not null,
  sequence int not null,
  -- Cached projection of the derived status (see fn_project_gate_status in
  -- 0007_functions.sql); kept in sync by trigger, never hand-set by a page.
  status gate_status not null default 'on_plan',
  held_since date,
  cleared_at timestamptz,
  target_date date,
  unique (project_id, code)
);

create index project_gates_project_idx on project_gates (project_id);

create table project_gate_conditions (
  id uuid primary key default gen_random_uuid(),
  project_gate_id uuid not null references project_gates (id) on delete cascade,
  template_condition_id uuid references template_gate_conditions (id) on delete set null,
  description text not null,
  status condition_status not null default 'open',
  owner condition_owner not null default 'team',
  sequence int not null,
  met_at timestamptz,
  signed_by uuid references people (id) on delete set null,
  signed_at timestamptz
);

create index project_gate_conditions_gate_idx on project_gate_conditions (project_gate_id);

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  project_phase_id uuid references project_phases (id) on delete set null,
  ref text not null,
  title text not null,
  description text,
  status task_status not null default 'idle',
  is_critical_path boolean not null default false,
  -- A milestone is a task with a client-visible date, not a separate object
  -- (per the design source's own note on screen F).
  client_visible_date date,
  due_date date,
  assignee_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, ref)
);

create index project_tasks_project_idx on project_tasks (project_id, status);

create table baselines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  version text not null,
  status baseline_status not null default 'draft',
  scope_snapshot jsonb not null default '{}'::jsonb,
  dates_snapshot jsonb not null default '{}'::jsonb,
  effort_snapshot jsonb not null default '{}'::jsonb,
  variance_days int,
  approved_by uuid references people (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index baselines_project_idx on baselines (project_id);

create table change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  ref text not null,
  title text not null,
  description text,
  impact_dates_days int,
  impact_effort text,
  impact_price text,
  status change_request_status not null default 'draft',
  -- e.g. "INC-114" when raised from a hypercare incident pattern — explicit
  -- cross-space provenance rather than a duplicated record.
  raised_from_ref text,
  created_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, ref)
);

create index change_requests_project_idx on change_requests (project_id);

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  file_asset_id uuid references file_assets (id) on delete set null,
  name text not null,
  kind text not null default 'artefact',
  version text not null default 'v1',
  visibility document_visibility not null default 'internal',
  requires_signature boolean not null default false,
  signed_by uuid references people (id) on delete set null,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index documents_project_idx on documents (project_id);

create table client_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  body text not null,
  status client_update_status not null default 'draft',
  author_person_id uuid references people (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index client_updates_project_idx on client_updates (project_id, status);

-- Client View Config is the publication boundary (architecture doc: "Internal
-- data -> Client View Config -> Publish -> Published Projection -> P·1 +
-- Q"). `fields` toggles what categories are eligible; `published_snapshot`
-- is the actual frozen projection P·1/Q read, refreshed only on publish.
create table client_view_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  fields jsonb not null default '{
    "status": true, "timeline": true, "milestones": true,
    "updates": true, "documents": true
  }'::jsonb,
  published_snapshot jsonb,
  published_at timestamptz,
  published_by uuid references people (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  token text not null unique,
  status share_link_status not null default 'active',
  expires_at timestamptz,
  created_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_regenerated_at timestamptz
);

create index share_links_project_idx on share_links (project_id);

create table share_link_views (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references share_links (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_city text,
  ip_country text
);

create index share_link_views_link_idx on share_link_views (share_link_id, viewed_at desc);

-- Client-portal actions requiring participation (Q screen). Distinct from
-- P·1, which never carries interactive state.
create table client_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind client_action_kind not null,
  title text not null,
  description text,
  status client_action_status not null default 'pending',
  assigned_person_id uuid references people (id) on delete set null,
  related_document_id uuid references documents (id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

create index client_actions_project_idx on client_actions (project_id, status);

create table client_signatures (
  id uuid primary key default gen_random_uuid(),
  client_action_id uuid references client_actions (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  document_id uuid references documents (id) on delete set null,
  required_signer_person_id uuid references people (id) on delete set null,
  status client_action_status not null default 'pending',
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index client_signatures_project_idx on client_signatures (project_id);
