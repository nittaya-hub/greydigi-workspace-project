-- Adds the data behind the client-facing "Timeline (Gantt)" section: a
-- week-by-week bar chart matching the format of the fortnightly
-- checkpoint deck (see supabase/README.md and the NK_Core_checkpoint PDF
-- shared 2026-09-09) instead of duplicating a second, parallel task list
-- just for the chart. The chart is DERIVED entirely from project_tasks
-- (already fully add/edit/delete-able from the Tasks and milestones tab
-- as of this session) and project_phases — no new table, so a task
-- edited on Tuesday shows up in the Friday client checkpoint
-- automatically, with nothing to keep in sync by hand.
--
-- New key: 'gantt', defaulting OFF (coalesce(...,false)) rather than ON
-- like the five original fields -- this is a new, visually heavy section
-- nobody has opted into yet, unlike phase/gate status which every
-- existing project already showed before Client View Config existed.
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

  if coalesce((v_config.fields->>'timeline')::boolean, true) then
    v_result := v_result || jsonb_build_object(
      'phases', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'code', code, 'name', name, 'index', index,
          'started_at', started_at, 'completed_at', completed_at,
          'duration_label', duration_label, 'show_duration_label', show_duration_label
        ) order by index), '[]'::jsonb)
        from project_phases where project_id = p_project_id
      )
    );
  end if;

  if coalesce((v_config.fields->>'status')::boolean, true) then
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

  if coalesce((v_config.fields->>'milestones')::boolean, true) then
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

  if coalesce((v_config.fields->>'updates')::boolean, true) then
    v_result := v_result || jsonb_build_object(
      'updates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'title', title, 'body', body, 'published_at', published_at
        ) order by published_at desc), '[]'::jsonb)
        from client_updates where project_id = p_project_id and status = 'published'
      )
    );
  end if;

  if coalesce((v_config.fields->>'documents')::boolean, true) then
    v_result := v_result || jsonb_build_object(
      'documents', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', name, 'kind', kind, 'version', version, 'created_at', created_at
        ) order by created_at desc), '[]'::jsonb)
        from documents where project_id = p_project_id and visibility = 'client_visible'
      )
    );
  end if;

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

  if coalesce((v_config.fields->>'gantt')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'gantt_tasks', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', ref, 'title', title, 'status', status, 'due_date', due_date,
          'is_critical_path', is_critical_path, 'client_visible_date', client_visible_date,
          'project_phase_id', project_phase_id
        ) order by due_date nulls last, created_at), '[]'::jsonb)
        from project_tasks
        where project_id = p_project_id
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;
