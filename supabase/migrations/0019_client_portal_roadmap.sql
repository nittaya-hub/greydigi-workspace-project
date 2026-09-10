-- Wires roadmap_items.client_visible (added in
-- 0014_task_drawer_roadmap_visibility.sql) through to the client portal.
-- Until now the toggle persisted but nothing client-facing read it — see
-- the redesign-spec audit, "Client View Configuration & Portal Lifecycle,
-- feature visibility flag". Only completed items are eligible: the spec
-- asks to pick "which completed items display on the client roadmap", and
-- a client should never see a forecast/committed/in-progress item that
-- could still change or slip.
--
-- Full create-or-replace since Postgres has no ALTER FUNCTION for a body
-- diff; everything below is unchanged from 0018 except the added
-- 'roadmap' block, gated by client_view_configs.fields the same way every
-- other section already is.
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
          'started_at', started_at, 'completed_at', completed_at,
          'duration_label', duration_label, 'show_duration_label', show_duration_label
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

  -- Roadmap is workspace-wide by design (products/roadmap_items carry no
  -- client_id — see the note in src/lib/data/shell.ts), so this is not
  -- filtered by this project's client: it is the same shared list of
  -- shipped, client-flagged items on every client's portal, same as the
  -- toggle's "surface on the client's roadmap" intent in 0014's comment.
  --
  -- coalesce(..., true), not "fields is null or ...": unlike the five
  -- fields above (all present together since fn_client_portal_project's
  -- first version in 0008), 'roadmap' is a key added to this function
  -- after client_view_configs rows already exist with a non-null fields
  -- object that simply predates this key. "fields is null or (missing
  -- key)::boolean" evaluates that OR to null (not true) for such a row,
  -- silently hiding the section even though the config page's own
  -- default (`fields[key] !== false`) shows the toggle on. coalesce
  -- makes an absent key default to visible either way, matching the UI.
  if coalesce((v_config.fields->>'roadmap')::boolean, true) then
    v_result := v_result || jsonb_build_object(
      'roadmap', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', ri.ref, 'title', ri.title, 'kind', ri.kind, 'quarter', ri.quarter
        ) order by ri.quarter nulls last, ri.ref), '[]'::jsonb)
        from roadmap_items ri
        where ri.client_visible = true and ri.status = 'done'
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;
