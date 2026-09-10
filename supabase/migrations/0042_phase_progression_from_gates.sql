-- Gates already derive their own status from conditions
-- (fn_recompute_project_gates, 0006_state_engine.sql) -- but nothing
-- ever stamped project_phases.started_at/completed_at. A project's
-- phases sat frozen at "Not started" forever unless someone hand-wrote
-- dates directly into the table (which supabase/seed_nk_live.sql does,
-- but no UI or trigger ever did for a real, live project) -- so ticking
-- every gate condition on Flight plan check correctly cleared the
-- gates, but the flight-plan spine and "Where we are" hero on the
-- project Overview kept showing phase 00 forever, 0% progress, because
-- nothing told the phases a gate had cleared.
--
-- This closes that gap the same way every other derived field in this
-- engine works: phase progression follows gate clearance, never
-- hand-set. Each gate belongs to exactly one phase (project_gates.
-- project_phase_id) -- when that gate clears for the first time, every
-- phase up to and including its own is marked complete (phase 00 owns
-- no gate of its own, so G1 clearing is what completes it too, not just
-- phase 01) and the next phase (by index) is marked started. Both use
-- `coalesce(existing, now())`, so re-running this function (e.g. a
-- later condition reopens and recloses the same gate) never overwrites
-- a date that's already real, and it only fires on the actual
-- open->cleared transition (`gate.status is distinct from 'cleared'`),
-- not on every recompute.
create or replace function fn_recompute_project_gates(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  gate record;
  found_held boolean := false;
  open_count int;
  v_phase_index int;
begin
  for gate in
    select id, sequence, project_phase_id, status
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

      if gate.status is distinct from 'cleared' and gate.project_phase_id is not null then
        select index into v_phase_index from project_phases where id = gate.project_phase_id;

        -- Phases are strictly sequential and some (00 Readiness check,
        -- between G-less phase 06) own no gate at all -- clearing G1
        -- (phase 01's gate) means phase 00 is done too, not just phase
        -- 01, so this completes every phase up to and including this
        -- gate's own phase, not only the one exact match.
        update project_phases
        set started_at = coalesce(started_at, now()),
            completed_at = coalesce(completed_at, now())
        where project_id = p_project_id and index <= v_phase_index;

        update project_phases
        set started_at = coalesce(started_at, now())
        where project_id = p_project_id and index = v_phase_index + 1;
      end if;
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

-- Existing projects whose gates already cleared before this fix (e.g.
-- NK-P1's G1-G3 from supabase/seed_nk_live.sql) never got this cascade
-- run against them -- their phases are already hand-dated correctly in
-- that seed file, so no backfill is needed there. A project created
-- through the app itself (no hand-written phase dates) picks up the fix
-- automatically the next time any gate condition changes, since the
-- trigger calls this same function.
