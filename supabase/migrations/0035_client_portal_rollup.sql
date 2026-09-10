-- Client-level rollup for the Delivery space. Today a client-portal user
-- can only ever be handed one project ref at a time (fn_client_portal_project
-- takes p_project_id) -- there is no page that lists every active project
-- under one client. This adds that listing, kept deliberately thin: it
-- returns only summary fields (health/progress/current phase), reusing
-- fn_project_health/fn_project_progress_pct rather than re-deriving them.
-- Per-project detail still goes through the existing fn_client_portal_project,
-- unchanged.
create or replace function fn_client_portal_projects(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_client_name text;
  v_result jsonb;
begin
  select name into v_client_name from clients where id = p_client_id;
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  v_authorized := (
    p_client_id in (select fn_my_client_ids())
    or p_client_id in (select id from clients where workspace_id in (select fn_my_internal_workspace_ids()))
  );
  if not v_authorized then
    return jsonb_build_object('state', 'not_found');
  end if;

  select jsonb_build_object(
    'state', 'ok',
    'client_name', v_client_name,
    'projects', coalesce(jsonb_agg(jsonb_build_object(
      'ref', p.ref,
      'name', p.name,
      'go_live_target', p.go_live_target,
      'health', fn_project_health(p.id),
      'progress_pct', fn_project_progress_pct(p.id),
      'current_phase', (
        select jsonb_build_object('code', ph.code, 'name', ph.name)
        from project_phases ph
        where ph.project_id = p.id and ph.completed_at is null
        order by ph.index limit 1
      )
    ) order by p.created_at), '[]'::jsonb)
  ) into v_result
  from projects p
  where p.client_id = p_client_id and p.status = 'active';

  return v_result;
end;
$$;

revoke all on function fn_client_portal_projects(uuid) from public;
grant execute on function fn_client_portal_projects(uuid) to authenticated;
