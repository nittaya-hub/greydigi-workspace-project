-- Editable "when" caption per phase (e.g. "Day 0", "Weeks 1 to 3") for the
-- flight-plan spine (FlightPlanSpine.tsx / the flight-plan deck design).
-- Deliberately NOT a computed day/week offset: neither template_phases nor
-- project_phases has any duration/date-range column, only real timestamps
-- (started_at/completed_at/target_date), and fabricating a week number from
-- those would misrepresent projects that don't match the reference deck's
-- timeline. Instead this is free text the team sets explicitly per phase,
-- with a toggle to hide it (falling back to the spine's existing
-- started_at/completed_at caption) without losing the text.
--
-- Lives on template_phases (edited on the Templates page) and separately on
-- project_phases, copied over at clone time in
-- src/app/(app)/delivery/projects/actions.ts::createProject -- same
-- pattern as every other project_phases field: independent after cloning,
-- so a later template edit never moves work already in flight.
alter table template_phases add column duration_label text;
alter table template_phases add column show_duration_label boolean not null default true;

alter table project_phases add column duration_label text;
alter table project_phases add column show_duration_label boolean not null default true;

-- Extend fn_client_portal_project's phases block (added in
-- 0016_client_portal_security_definer_and_gates.sql) to carry the two new
-- columns through to the client-portal FlightPlanSpine render. Full
-- create-or-replace since Postgres has no ALTER FUNCTION for a body diff;
-- everything below is unchanged from 0016 except the two added keys in the
-- 'phases' jsonb_build_object.
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

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;
