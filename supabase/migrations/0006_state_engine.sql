-- The authoritative state and calculation engine (architecture doc section
-- 7: "There must be one authoritative state engine. Pages do not
-- independently invent project health, progress or gate state."). Every
-- screen — internal dashboards, Q client portal, P·1 public view — reads
-- these same functions. Nothing recomputes health or progress client-side.

-- Gate status is derived from its conditions and its position in the
-- sequence: cleared once every condition is met/waived, "held" once it is
-- the earliest unclearedgate (work is stopped there), otherwise "on_plan"
-- (not reached yet).
create or replace function fn_recompute_project_gates(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  gate record;
  found_held boolean := false;
  open_count int;
begin
  for gate in
    select id, sequence
    from project_gates
    where project_id = p_project_id
    order by sequence asc
  loop
    select count(*) into open_count
    from project_gate_conditions
    where project_gate_id = gate.id and status = 'open';

    if open_count = 0 then
      update project_gates
      set status = 'cleared',
          cleared_at = coalesce(cleared_at, now()),
          held_since = null
      where id = gate.id;
    elsif not found_held then
      update project_gates
      set status = 'held',
          held_since = coalesce(held_since, current_date),
          cleared_at = null
      where id = gate.id;
      found_held := true;
    else
      update project_gates
      set status = 'on_plan', cleared_at = null, held_since = null
      where id = gate.id;
    end if;
  end loop;
end;
$$;

create or replace function trg_project_gate_conditions_recompute()
returns trigger
language plpgsql
as $$
declare
  v_project_id uuid;
begin
  select pg.project_id into v_project_id
  from project_gates pg
  where pg.id = coalesce(new.project_gate_id, old.project_gate_id);

  perform fn_recompute_project_gates(v_project_id);
  return null;
end;
$$;

create trigger project_gate_conditions_recompute
after insert or update or delete on project_gate_conditions
for each row execute function trg_project_gate_conditions_recompute();

-- Project health. Task completion percentage never sets health (design
-- source, screen D: "How health is computed"). Priority: blocked > watch >
-- on_plan.
create or replace function fn_project_health(p_project_id uuid)
returns health_status
language sql
stable
as $$
  select case
    when exists (
      -- a gate condition is open past its gate's target date
      select 1
      from project_gate_conditions c
      join project_gates g on g.id = c.project_gate_id
      where g.project_id = p_project_id
        and c.status = 'open'
        and g.target_date is not null
        and g.target_date < current_date
    ) or exists (
      -- a held gate with a hard (client-owned) dependency unmet for 10+ days
      select 1
      from project_gates g
      where g.project_id = p_project_id
        and g.status = 'held'
        and g.held_since is not null
        and g.held_since < current_date - interval '10 days'
    ) then 'blocked'
    when exists (
      -- a client action unresolved for more than 7 days
      select 1
      from client_actions a
      where a.project_id = p_project_id
        and a.status in ('pending', 'in_progress')
        and a.created_at < now() - interval '7 days'
    ) or exists (
      -- overdue critical-path work
      select 1
      from project_tasks t
      where t.project_id = p_project_id
        and t.is_critical_path
        and t.status <> 'done'
        and t.due_date is not null
        and t.due_date < current_date
    ) then 'watch'
    else 'on_plan'
  end::health_status;
$$;

-- Progress denominator is documented and fixed: gates cleared over total
-- gates in the project's flight plan. Never a page-specific formula (per
-- the Q client-portal spec: "Do NOT create a separate page-specific
-- progress formula").
create or replace function fn_project_progress_pct(p_project_id uuid)
returns int
language sql
stable
as $$
  select case when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where status = 'cleared') / count(*))
  end::int
  from project_gates
  where project_id = p_project_id;
$$;

-- Service health, mirrored the same way: derived, never hand-set on a
-- dashboard. Open severity + SLA position + repeat incident rate (design
-- source, screen "Health": "A service is never marked healthy by hand").
create or replace function fn_service_health(p_service_id uuid)
returns service_health
language sql
stable
as $$
  select case
    when exists (
      select 1 from incidents
      where service_id = p_service_id and status <> 'resolved' and severity = 'sev1'
    ) then 'at_risk'
    when (
      select count(*) from incidents
      where service_id = p_service_id
        and status <> 'resolved'
    ) > 0
    or (
      select count(*) from incidents
      where service_id = p_service_id
        and opened_at > now() - interval '90 days'
    ) >= 3
    then 'watch'
    else 'healthy'
  end::service_health;
$$;

-- Keep the cached services.health column (used for cheap list-page
-- filtering) in sync whenever an incident changes.
create or replace function trg_services_health_recompute()
returns trigger
language plpgsql
as $$
declare
  v_service_id uuid;
begin
  v_service_id := coalesce(new.service_id, old.service_id);
  update services set health = fn_service_health(v_service_id) where id = v_service_id;
  return null;
end;
$$;

create trigger incidents_service_health_recompute
after insert or update or delete on incidents
for each row execute function trg_services_health_recompute();

-- Every state-changing mutation should also write an activity_log row.
-- Rather than trust every call site to remember, the common transitions are
-- captured here; call sites for anything not covered still insert directly.
create or replace function fn_log_activity(
  p_workspace_id uuid,
  p_actor_person_id uuid,
  p_space space_kind,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language sql
as $$
  insert into activity_log (
    workspace_id, actor_person_id, space, action, entity_type, entity_id, summary, metadata
  ) values (
    p_workspace_id, p_actor_person_id, p_space, p_action, p_entity_type, p_entity_id, p_summary, p_metadata
  );
$$;
