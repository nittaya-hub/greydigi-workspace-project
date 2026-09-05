-- 0015 fixed the silent activity_log write failure by making fn_log_activity
-- security definer. That bypasses RLS entirely for the function, which is
-- inconsistent with how every other write in this schema is scoped (under
-- the calling user's own RLS context) and opens a path where the function
-- could be called with an arbitrary workspace_id/actor_person_id outside the
-- caller's own workspace, with no policy check to catch it.
--
-- Revert fn_log_activity to plain `language sql` (caller's privileges, as
-- originally defined in 0006_state_engine.sql) and fix the actual gap
-- instead: activity_log had a SELECT policy but no INSERT policy. Add one,
-- scoped the same way as the read policy and every other "_internal" write
-- policy (0007_rls.sql, 0012_clients_write_rls.sql). INSERT-only, not
-- "for all" -- the audit page describes activity_log as append-only, so it
-- should never be updatable/deletable via RLS.

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

create policy activity_log_write on activity_log for insert
  with check (workspace_id in (select fn_my_internal_workspace_ids()));
