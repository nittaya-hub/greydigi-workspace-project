-- TEST PROVISIONING, not the real go-live -- creates a Hypercare service
-- (+ SLA policy + P1/P2/P3 tiers) so the Hypercare space can be exercised
-- for real ahead of an actual G5 clear (see
-- src/lib/data/service-provisioning.ts::ensureServiceForProject, wired
-- into the Flight plan check "mark met"/"override" actions).
--
-- Targets the client/project created by hand through the app's own UI
-- (New Client / New Project), not supabase/seed_nk_live.sql's NK-P1 --
-- that seed was never run against this database, so this looks up the
-- client by name (case/whitespace-insensitive, across every workspace,
-- since which workspace it landed in isn't assumed) and the project by
-- ref 'phase1' under that client, falling back to that client's only
-- project if there's exactly one and its ref doesn't match.
--
-- Safe to run again later: the service is keyed by origin_project_id, so
-- if this project later earns a real service at G5, ensureServiceForProject
-- finds this row already exists and skips creating a second one.
--
-- SLA targets are the real, signed numbers from SOW-2026-002 section 6:
-- P1 6 service hours / daily update, P2 1 Business Day (9 service hours
-- = 540 min) / every 2 Business Days, P3 3 Business Days (1620 min) / on
-- progress. live_since is left null -- this service is provisioned for
-- testing, not actually live.

begin;

do $$
declare
  v_workspace_id uuid;
  v_client_id uuid;
  v_client_name text;
  v_project_id uuid;
  v_project_name text;
  v_project_count int;
  v_service_id uuid;
  v_policy_id uuid;
begin
  select c.id, c.workspace_id, c.name into v_client_id, v_workspace_id, v_client_name
  from clients c
  where trim(lower(c.name)) = 'nutrition kitchen'
  order by c.created_at asc
  limit 1;

  if v_client_id is null then
    raise exception 'No client matching "Nutrition Kitchen" found in any workspace. Check the exact name in Clients and tell me what it is.';
  end if;

  select p.id, p.name into v_project_id, v_project_name
  from projects p
  where p.client_id = v_client_id and trim(lower(p.ref)) = 'phase1';

  if v_project_id is null then
    select count(*) into v_project_count from projects where client_id = v_client_id;
    if v_project_count = 1 then
      select p.id, p.name into v_project_id, v_project_name from projects p where p.client_id = v_client_id;
    else
      raise exception 'Client "%" has % project(s) and none has ref "phase1". Tell me the exact ref.', v_client_name, v_project_count;
    end if;
  end if;

  select id into v_service_id from services where origin_project_id = v_project_id;
  if v_service_id is null then
    insert into services (workspace_id, client_id, origin_project_id, ref, name, live_since)
    select
      v_workspace_id, v_client_id, v_project_id,
      'SVC-' || lpad((coalesce((select count(*) from services where workspace_id = v_workspace_id), 0) + 1)::text, 2, '0'),
      v_project_name, null
    returning id into v_service_id;
  end if;

  insert into sla_policies (service_id, name, response_target_minutes, resolve_target_minutes, business_hours_only)
  values (v_service_id, v_project_name || ' SLA (SOW-2026-002)', 360, 1620, true)
  on conflict (service_id) do update set
    name = excluded.name, response_target_minutes = excluded.response_target_minutes,
    resolve_target_minutes = excluded.resolve_target_minutes, business_hours_only = excluded.business_hours_only
  returning id into v_policy_id;

  insert into sla_policy_tiers (sla_policy_id, severity, response_target_minutes, update_cadence_minutes) values
    (v_policy_id, 'sev1', 360, 1440),
    (v_policy_id, 'sev2', 540, 1080),
    (v_policy_id, 'sev3', 1620, null)
  on conflict (sla_policy_id, severity) do update set
    response_target_minutes = excluded.response_target_minutes,
    update_cadence_minutes = excluded.update_cadence_minutes;

  raise notice 'Provisioned service for project % (%) under client %.', v_project_name, v_project_id, v_client_name;
end $$;

commit;
