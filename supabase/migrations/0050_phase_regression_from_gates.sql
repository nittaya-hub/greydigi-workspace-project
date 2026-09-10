-- 0042 made phase progression follow gate clearance forward (clearing a
-- gate stamps its phase, and every phase before it, as completed, and
-- starts the next one) but never the other way. Revert (added this
-- session, flight-plan-check/actions.ts's revertGateCondition) puts a
-- condition back to open and the gate correctly flips back to
-- held/on_plan -- but project_phases.completed_at/started_at, once
-- stamped, stayed stamped forever. Tested live: reverting both of G4's
-- conditions correctly re-held G4 (Flight plan check showed it
-- instantly), but the Overview page kept reading "Phase 06 Operate and
-- expand" as current, because getProjectByRef's `currentPhase` is
-- exactly `phases.find(p => !p.completed_at)` (src/lib/data/project.ts)
-- and phase 06's row was never told the gate that had gotten it there
-- (G4, opened during phase 04) had reopened.
--
-- This closes the reverse direction the same way 0042 opened the
-- forward one: when a gate that WAS cleared stops being cleared (found
-- open conditions again on this recompute), un-stamp completed_at on
-- its own phase and every phase after it, and un-stamp started_at on
-- every phase strictly after it -- its own phase keeps started_at,
-- since it genuinely did start, it just isn't finished anymore.
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

        update project_phases
        set started_at = coalesce(started_at, now()),
            completed_at = coalesce(completed_at, now())
        where project_id = p_project_id and index <= v_phase_index;

        update project_phases
        set started_at = coalesce(started_at, now())
        where project_id = p_project_id and index = v_phase_index + 1;
      end if;
    else
      if gate.status = 'cleared' and gate.project_phase_id is not null then
        select index into v_phase_index from project_phases where id = gate.project_phase_id;

        update project_phases
        set completed_at = null
        where project_id = p_project_id and index >= v_phase_index;

        update project_phases
        set started_at = null
        where project_id = p_project_id and index > v_phase_index;
      end if;

      if not found_held then
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
    end if;
  end loop;
end;
$$;
