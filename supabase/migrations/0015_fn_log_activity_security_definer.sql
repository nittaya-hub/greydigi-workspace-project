-- fn_log_activity ran as plain `language sql` (caller's privileges), and
-- activity_log has only a SELECT RLS policy (0007_rls.sql) -- so every
-- call from the normal RLS-scoped client has been silently failing
-- workspace-wide since it was introduced (people/invite, clients/[id]
-- portal-access grants, and now the task drawer's activity tab all call
-- it). Fixed the targeted way: make the function security definer, like
-- every other privileged RPC in this schema (fn_publish_client_view,
-- fn_client_portal_project) -- rather than opening a direct INSERT policy
-- on the table, which would let any authenticated row bypass the
-- append-only, function-mediated write path the table's own comment
-- describes.
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
security definer
set search_path = public
as $$
  insert into activity_log (
    workspace_id, actor_person_id, space, action, entity_type, entity_id, summary, metadata
  ) values (
    p_workspace_id, p_actor_person_id, p_space, p_action, p_entity_type, p_entity_id, p_summary, p_metadata
  );
$$;

revoke all on function fn_log_activity(uuid, uuid, space_kind, text, text, uuid, text, jsonb) from public;
grant execute on function fn_log_activity(uuid, uuid, space_kind, text, text, uuid, text, jsonb) to authenticated;
