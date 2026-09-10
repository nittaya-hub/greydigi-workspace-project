-- 0051 tried to backfill by calling fn_recompute_project_gates() again,
-- but that didn't work -- and now it's clear why. The reverse cascade in
-- 0050 only fires on the actual cleared->held transition (mirroring
-- 0042's own forward-cascade guard, `status is distinct from 'cleared'`,
-- so a recompute that finds nothing new never re-touches an already-
-- correct date). But project_gates.status itself was ALREADY flipped
-- back to 'held' the moment the condition was reverted, under the OLD
-- (pre-0050) function -- gate status was always bidirectional; only the
-- phase-date cascade was one-directional. So by the time 0050 and 0051
-- ran, G4 was sitting at 'held' already, and re-running the recompute
-- found no fresh transition to react to -- the phase dates never got a
-- chance to unstamp.
--
-- This backfill doesn't wait for a transition. For every project, it
-- looks at which gate is the first (lowest-sequence) one NOT cleared
-- right now, and treats every phase from that gate's phase index onward
-- as not-yet-completed (and every phase strictly after it as not
-- started), unconditionally -- a direct resync from current gate state
-- instead of an edge-triggered patch. A project with every gate cleared
-- is left untouched (nothing to roll back).
do $$
declare
  proj record;
  v_first_open_index int;
begin
  for proj in select id from projects loop
    select pg.index into v_first_open_index
    from project_gates g
    join project_phases pg on pg.id = g.project_phase_id
    where g.project_id = proj.id and g.status <> 'cleared'
    order by g.sequence asc
    limit 1;

    if v_first_open_index is null then
      continue;
    end if;

    update project_phases
    set completed_at = null
    where project_id = proj.id and index >= v_first_open_index;

    update project_phases
    set started_at = null
    where project_id = proj.id and index > v_first_open_index;
  end loop;
end $$;
