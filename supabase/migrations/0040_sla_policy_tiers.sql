-- sla_policies today is one flat response/resolve target per service --
-- real Hypercare SOWs (e.g. SOW-2026-002 section 6) commit to three
-- separate targets by incident severity (P1/P2/P3), each with a first-
-- response target and an update cadence, and explicitly no resolve-time
-- commitment at all ("these are service targets, not guaranteed service
-- levels"). This adds the per-severity table needed to represent that
-- correctly, without touching sla_policies' existing flat columns --
-- Settings -> SLA and the service detail stat tile keep working
-- unchanged; this is additive.
create table sla_policy_tiers (
  id uuid primary key default gen_random_uuid(),
  sla_policy_id uuid not null references sla_policies (id) on delete cascade,
  severity incident_severity not null,
  response_target_minutes int not null,
  update_cadence_minutes int,
  unique (sla_policy_id, severity)
);

create index sla_policy_tiers_policy_idx on sla_policy_tiers (sla_policy_id);

alter table sla_policy_tiers enable row level security;

create policy sla_policy_tiers_internal on sla_policy_tiers for all
  using (
    sla_policy_id in (
      select sp.id from sla_policies sp
      join services s on s.id = sp.service_id
      where s.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

-- incidents.breach_at was declared in 0005_hypercare.sql but nothing has
-- ever computed it -- logIncident (src/app/(app)/hypercare/incidents/
-- actions.ts) always left it null. Alongside this migration it starts
-- getting set from the matching tier's response_target_minutes, so this
-- column just needs to exist; no schema change required for that fix.
