-- Agent registry: the reusable-definition / per-client-deployment model
-- from the External Agent Integration blueprint (section 8.1), scoped
-- deliberately tight for this first pass.
--
-- What this migration deliberately does NOT build, and why: agent_runs,
-- an adapter, a scheduler, or anything that could actually invoke an
-- external provider or incur a real cost. No real agent/provider has
-- been chosen yet and no one has been named as the payer for one -- per
-- the blueprint's own section 5.4 ("if a provider cannot expose a
-- supported callable interface... the UI should say 'Integration
-- required' instead of pretending the agent is ready"), the connect
-- wizard this migration backs stops at a saved draft. Activating a
-- deployment or running a real test is wired in the UI as an explicitly
-- disabled action, not as a half-built execution path, so this cannot
-- become a source of unexpected spend before that decision is made.
--
-- agent_connections never stores a real secret value -- secret_ref is a
-- human label ("1Password: Weekly Update Agent prod key") for whoever
-- manages the real credential elsewhere, not a place to paste one in.

do $$ begin
  create type agent_connector_type as enum ('external_api', 'n8n_workflow');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type agent_connection_status as enum ('not_configured', 'needs_verification', 'verified', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type agent_deployment_status as enum ('draft', 'ready', 'active', 'paused', 'retired');
exception when duplicate_object then null;
end $$;

-- One reusable capability, registered once. "1 agent definition, many
-- separately governed deployments" (blueprint section 1) -- this table
-- is the "1 agent definition" half.
create table if not exists agent_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  purpose text not null,
  task_template text not null,
  owner_person_id uuid references people (id),
  approved boolean not null default false,
  created_by uuid references people (id),
  created_at timestamptz not null default now()
);

create index if not exists agent_definitions_workspace_idx on agent_definitions (workspace_id);

-- Where the agent actually runs. No real secret value lives in this
-- table -- secret_ref is a pointer for a human, not a credential store.
create table if not exists agent_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  connector_type agent_connector_type not null,
  endpoint_url text,
  auth_method text,
  secret_ref text,
  status agent_connection_status not null default 'not_configured',
  created_by uuid references people (id),
  created_at timestamptz not null default now()
);

create index if not exists agent_connections_workspace_idx on agent_connections (workspace_id);

-- A client-specific use of an agent definition through a connection.
-- Scope is deliberately a plain-text description plus an optional
-- project link, not a permissions engine -- the blueprint's access
-- categories (section 11.4) are represented as the four boolean flags
-- below rather than a generalized rule system, matching how narrow this
-- first pass is meant to be.
create table if not exists agent_deployments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  agent_definition_id uuid not null references agent_definitions (id) on delete cascade,
  connection_id uuid references agent_connections (id),
  project_id uuid references projects (id),
  scope_description text,
  can_read boolean not null default false,
  can_create_drafts boolean not null default false,
  can_change_records boolean not null default false,
  can_publish boolean not null default false,
  schedule_description text,
  timezone text,
  owner_person_id uuid references people (id),
  reviewer_person_id uuid references people (id),
  budget_note text,
  status agent_deployment_status not null default 'draft',
  created_by uuid references people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_deployments_workspace_idx on agent_deployments (workspace_id);
create index if not exists agent_deployments_definition_idx on agent_deployments (agent_definition_id);
create index if not exists agent_deployments_project_idx on agent_deployments (project_id);

alter table agent_definitions enable row level security;
alter table agent_connections enable row level security;
alter table agent_deployments enable row level security;

drop policy if exists agent_definitions_internal on agent_definitions;
create policy agent_definitions_internal on agent_definitions for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists agent_connections_internal on agent_connections;
create policy agent_connections_internal on agent_connections for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists agent_deployments_internal on agent_deployments;
create policy agent_deployments_internal on agent_deployments for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));
