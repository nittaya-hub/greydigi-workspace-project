-- Real bug: fn_client_portal_project is `security invoker`, but the
-- tables it reads for phases/milestones (project_phases, project_tasks)
-- have ONLY internal-only RLS policies (project_phases_internal,
-- project_tasks_internal in 0007_rls.sql -- no client_roles-based read
-- policy exists on either). So a real client-portal login has been
-- getting empty phases/milestones back from this function all along --
-- it only ever looked correct because every manual check so far was done
-- as an internal admin previewing, whose RLS is internal-scoped and thus
-- happens to pass. The architecture doc is explicit that this function
-- (plus fn_public_share_view) is meant to be *the* controlled boundary
-- between internal tables and anything client-facing -- "client access
-- to a project's delivery data goes through the published projection,
-- not these raw tables" (0007_rls.sql comment) -- so the fix is to make
-- it security definer, like fn_publish_client_view already is, and add
-- an explicit authorization check inside the function body (since
-- security definer bypasses RLS entirely, skipping that check would let
-- any signed-in client read any other client's project by guessing a
-- project id).
--
-- Also adds a `gates` block, gated by the same 'status' field toggle
-- that already claims to control "Phase and gate status" but never
-- actually returned gate data -- the toggle existed and did nothing.
create or replace function fn_client_portal_project(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_config record;
  v_project record;
  v_result jsonb;
  v_authorized boolean;
begin
  select * into v_config from client_view_configs where project_id = p_project_id;
  select p.*, c.name as client_name into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = p_project_id;

  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  v_authorized := (
    v_project.workspace_id in (select fn_my_internal_workspace_ids())
    or v_project.client_id in (select fn_my_client_ids())
  );
  if not v_authorized then
    return jsonb_build_object('state', 'not_found');
  end if;

  v_result := jsonb_build_object(
    'state', 'ok',
    'project', jsonb_build_object(
      'name', v_project.name,
      'description', v_project.description,
      'client_name', v_project.client_name,
      'go_live_target', v_project.go_live_target
    ),
    'health', fn_project_health(p_project_id),
    'progress_pct', fn_project_progress_pct(p_project_id),
    'actions_required', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'title', title, 'description', description,
        'status', status, 'due_at', due_at
      ) order by due_at nulls last), '[]'::jsonb)
      from client_actions where project_id = p_project_id
    ),
    'signatures', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'status', status, 'signed_at', signed_at
      )), '[]'::jsonb)
      from client_signatures where project_id = p_project_id
    )
  );

  if v_config.fields is null or (v_config.fields->>'timeline')::boolean then
    v_result := v_result || jsonb_build_object(
      'phases', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', code, 'name', name, 'index', index,
          'started_at', started_at, 'completed_at', completed_at
        ) order by index), '[]'::jsonb)
        from project_phases where project_id = p_project_id
      )
    );
  end if;

  if v_config.fields is null or (v_config.fields->>'status')::boolean then
    v_result := v_result || jsonb_build_object(
      'gates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', code, 'name', name, 'sequence', sequence,
          'status', status, 'target_date', target_date
        ) order by sequence), '[]'::jsonb)
        from project_gates where project_id = p_project_id
      )
    );
  end if;

  if v_config.fields is null or (v_config.fields->>'milestones')::boolean then
    v_result := v_result || jsonb_build_object(
      'milestones', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', ref, 'title', title, 'status', status, 'date', client_visible_date
        ) order by client_visible_date), '[]'::jsonb)
        from project_tasks
        where project_id = p_project_id and client_visible_date is not null
      )
    );
  end if;

  if v_config.fields is null or (v_config.fields->>'updates')::boolean then
    v_result := v_result || jsonb_build_object(
      'updates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'title', title, 'body', body, 'published_at', published_at
        ) order by published_at desc), '[]'::jsonb)
        from client_updates where project_id = p_project_id and status = 'published'
      )
    );
  end if;

  if v_config.fields is null or (v_config.fields->>'documents')::boolean then
    v_result := v_result || jsonb_build_object(
      'documents', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', name, 'kind', kind, 'version', version, 'created_at', created_at
        ) order by created_at desc), '[]'::jsonb)
        from documents where project_id = p_project_id and visibility = 'client_visible'
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;
