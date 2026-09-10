-- 0050 fixed fn_recompute_project_gates itself, but replacing a
-- function's body doesn't retroactively re-run it -- nothing calls it
-- again on its own. Every project whose gate got reverted BEFORE 0050
-- was applied is still carrying the stale phase dates the OLD (forward-
-- only) function wrote; only the NEXT write to project_gate_conditions
-- would have triggered the new logic. This runs the now-fixed function
-- once against every project's current, already-committed gate state,
-- so the fix applies immediately instead of waiting for someone to
-- touch a condition again.
select fn_recompute_project_gates(id) from projects;
