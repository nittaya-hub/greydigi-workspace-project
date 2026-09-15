-- Manifest: the fourth cockpit, "the company brain" (aironauts Decision
-- Pack, page 7, "No gate closes without a write-back"). Three objects:
--
-- - manifest_assets / manifest_asset_usages: agents, connectors, prompts
--   and document templates, registered with a reuse count. Curated by a
--   person -- nothing in the schema can detect "this agent got reused,"
--   so this is a deliberate log, not an inference.
-- - manifest_decisions: decisions, objections and how they resolved --
--   the pattern library the doc says the (not-yet-built) intake agent
--   and proposal draw from. Also curated.
-- - manifest_calibration: gate slip against its own target date --
--   planned vs actual, per the Decision Pack's own dashboard mock
--   ("Gate slip against the locked baseline, not percent complete").
--   This one is NOT curated: a trigger writes one row automatically the
--   moment a gate is cleared, so it is the literal, always-true half of
--   "no gate closes without a write-back." Assets and decisions stay
--   optional -- not every gate close produces a new reusable asset or a
--   notable decision, and forcing one would fabricate an obligation the
--   real workflow doesn't support (and risks the kind of hard-block
--   regression 0022/0023 already burned this workspace on once).

create type manifest_asset_kind as enum ('agent', 'connector', 'prompt', 'document_template');

create table manifest_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  kind manifest_asset_kind not null,
  description text,
  reuse_count int not null default 0,
  created_by_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index manifest_assets_workspace_idx on manifest_assets (workspace_id);

create table manifest_asset_usages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  asset_id uuid not null references manifest_assets (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  note text,
  logged_by_person_id uuid references people (id) on delete set null,
  used_at timestamptz not null default now()
);

create index manifest_asset_usages_asset_idx on manifest_asset_usages (asset_id);
create index manifest_asset_usages_project_idx on manifest_asset_usages (project_id);

create or replace function fn_manifest_asset_reuse_count()
returns trigger
language plpgsql
as $$
begin
  update manifest_assets
  set reuse_count = reuse_count + 1
  where id = new.asset_id;
  return new;
end;
$$;

create trigger manifest_asset_usages_reuse_count
  after insert on manifest_asset_usages
  for each row
  execute function fn_manifest_asset_reuse_count();

create table manifest_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  decision text not null,
  objection text,
  resolution text not null,
  created_by_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

create index manifest_decisions_project_idx on manifest_decisions (project_id);
create index manifest_decisions_workspace_idx on manifest_decisions (workspace_id);

create table manifest_calibration (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  project_gate_id uuid not null references project_gates (id) on delete cascade,
  gate_code text not null,
  target_date date,
  cleared_at timestamptz not null,
  -- Positive = cleared late against its own target, negative = early,
  -- null only when the gate never had a target date to measure against.
  slip_days int,
  created_at timestamptz not null default now(),
  unique (project_gate_id)
);

create index manifest_calibration_workspace_idx on manifest_calibration (workspace_id);
create index manifest_calibration_project_idx on manifest_calibration (project_id);

-- The write-back rule itself: fires once, the moment a gate's status
-- actually transitions into 'cleared' (fn_recompute_project_gates in
-- 0006_state_engine.sql re-runs this UPDATE idempotently on every
-- condition change via coalesce(cleared_at, now()), so the WHEN clause
-- below -- not a plain AFTER INSERT/UPDATE -- is what keeps this firing
-- exactly once per gate).
-- security definer: the gate-clear that triggers this can come from a
-- condition auto-confirm path as well as a direct app action (see
-- fn_log_activity_security_definer.sql for the same reasoning -- a
-- plain-privileges function silently fails wherever RLS doesn't already
-- grant the caller an explicit INSERT check on the target table).
create or replace function fn_manifest_writeback_on_gate_clear()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into manifest_calibration (workspace_id, project_id, project_gate_id, gate_code, target_date, cleared_at, slip_days)
  select p.workspace_id, new.project_id, new.id, new.code, new.target_date, new.cleared_at,
    case when new.target_date is not null then (new.cleared_at::date - new.target_date) else null end
  from projects p
  where p.id = new.project_id
  on conflict (project_gate_id) do nothing;
  return new;
end;
$$;

create trigger project_gates_manifest_writeback
  after update on project_gates
  for each row
  when (old.status is distinct from 'cleared' and new.status = 'cleared')
  execute function fn_manifest_writeback_on_gate_clear();

-- RLS: internal-only, same as everywhere else -- Manifest has no
-- client-scoped meaning (it's the company brain, not client work), so
-- there is no client-portal read path here at all, unlike projects/
-- services (0007_rls.sql pattern, fn_my_internal_workspace_ids()).
alter table manifest_assets enable row level security;
alter table manifest_asset_usages enable row level security;
alter table manifest_decisions enable row level security;
alter table manifest_calibration enable row level security;

create policy manifest_assets_internal on manifest_assets for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy manifest_asset_usages_internal on manifest_asset_usages for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy manifest_decisions_internal on manifest_decisions for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy manifest_calibration_internal on manifest_calibration for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));
