-- Hypercare space: live client systems after go-live.

-- Created at G5 from the delivery project (architecture doc: "A Delivery
-- Project may create or link to a Hypercare Service after go-live"). Never
-- created by hand for a live client system — origin_project_id records the
-- provenance explicitly.
create table services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  client_id uuid not null references clients (id) on delete restrict,
  origin_project_id uuid references projects (id) on delete set null,
  ref text not null,
  name text not null,
  live_since date,
  health service_health not null default 'healthy',
  created_at timestamptz not null default now(),
  unique (workspace_id, ref)
);

create index services_workspace_idx on services (workspace_id);
create index services_client_idx on services (client_id);

create table sla_policies (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references services (id) on delete cascade,
  name text not null,
  response_target_minutes int not null,
  resolve_target_minutes int not null,
  business_hours_only boolean not null default true
);

-- Severity is read from the SLA policy at creation time, never typed by
-- whoever logs the incident (design source note on screen "Incidents").
create table incidents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  ref text not null,
  title text not null,
  severity incident_severity not null,
  status incident_status not null default 'open',
  opened_at timestamptz not null default now(),
  breach_at timestamptz,
  resolved_at timestamptz,
  root_cause text,
  created_by uuid references people (id) on delete set null,
  unique (service_id, ref)
);

create index incidents_service_idx on incidents (service_id, status);

create table support_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  ref text not null,
  title text not null,
  status support_request_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (service_id, ref)
);

create index support_requests_service_idx on support_requests (service_id, status);

-- Pause windows for SLA timers must carry a reason (design source note on
-- screen "SLA": "Every pause needs a reason").
create table incident_pauses (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents (id) on delete cascade,
  paused_at timestamptz not null default now(),
  resumed_at timestamptz,
  reason text not null
);

create table health_checks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  checked_at timestamptz not null default now(),
  status service_health not null,
  reason text
);

create index health_checks_service_idx on health_checks (service_id, checked_at desc);

create table escalations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  incident_id uuid references incidents (id) on delete set null,
  reason text not null,
  escalated_to_person_id uuid references people (id) on delete set null,
  status escalation_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index escalations_service_idx on escalations (service_id, status);
