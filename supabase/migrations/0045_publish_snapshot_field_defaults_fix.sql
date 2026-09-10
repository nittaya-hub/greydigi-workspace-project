-- Same bug as 0043, in a different function: fn_publish_client_view builds
-- the P·1 snapshot (the no-login share link) and reads each section with
-- `(v_config.fields->>'x')::boolean` -- true only if that exact key is
-- present in the jsonb AND explicitly true. The moment any one toggle on
-- Client View Config is saved, toggleClientViewField's own upsert (spread
-- existing fields, set the one key that changed) leaves every untouched
-- key absent from that object -- so `(absent)::boolean` is sql null, and
-- `if null then` is false, silently dropping that whole section from
-- every future published P·1 snapshot even though the admin's own screen
-- still shows the toggle on. This never surfaced as loudly as the live
-- portal version of the bug because P·1 was secondary while the
-- authenticated portal was the primary channel -- now that share links
-- are becoming the primary one, it matters as much as 0043 did.
--
-- Also brings this snapshot to parity with fn_client_portal_project: adds
-- 'roadmap' (present on the live portal since 0019, never added here) and
-- 'gantt_tasks' (added to the live portal in 0044) so a published P·1
-- snapshot shows the same sections the live portal does, not a subset.
create or replace function fn_publish_client_view(p_project_id uuid, p_published_by uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_project record;
  v_snapshot jsonb;
begin
  select * into v_config from client_view_configs where project_id = p_project_id;
  if not found then
    insert into client_view_configs (project_id) values (p_project_id) returning * into v_config;
  end if;

  select p.*, c.name as client_name into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = p_project_id;

  v_snapshot := jsonb_build_object(
    'project', jsonb_build_object(
      'name', v_project.name,
      'description', v_project.description,
      'client_name', v_project.client_name,
      'go_live_target', v_project.go_live_target
    ),
    'health', fn_project_health(p_project_id),
    'progress_pct', fn_project_progress_pct(p_project_id)
  );

  if coalesce((v_config.fields->>'status')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'gate', (
        select jsonb_build_object('code', code, 'name', name, 'status', status)
        from project_gates
        where project_id = p_project_id and status = 'held'
        order by sequence limit 1
      ),
      'phase', (
        select jsonb_build_object('code', code, 'name', name)
        from project_phases
        where project_id = p_project_id and completed_at is null
        order by index limit 1
      )
    );
  end if;

  if coalesce((v_config.fields->>'timeline')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'phases', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', code, 'name', name, 'index', index,
          'started_at', started_at, 'completed_at', completed_at
        ) order by index), '[]'::jsonb)
        from project_phases where project_id = p_project_id
      )
    );
  end if;

  if coalesce((v_config.fields->>'milestones')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
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
    v_snapshot := v_snapshot || jsonb_build_object(
      'updates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'title', title, 'body', body, 'published_at', published_at
        ) order by published_at desc), '[]'::jsonb)
        from client_updates
        where project_id = p_project_id and status = 'published'
      )
    );
  end if;

  if coalesce((v_config.fields->>'documents')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'documents', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', name, 'kind', kind, 'version', version, 'created_at', created_at
        ) order by created_at desc), '[]'::jsonb)
        from documents
        where project_id = p_project_id and visibility = 'client_visible'
      )
    );
  end if;

  if coalesce((v_config.fields->>'roadmap')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
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
    v_snapshot := v_snapshot || jsonb_build_object(
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

  -- Submission cards: only included (and only submittable, per the RPC
  -- below) when the corresponding Client View Config toggle is on. Options
  -- come from submission_taxonomy_options -- the same list Settings ->
  -- Submission types edits -- so retiring/renaming an option there is
  -- reflected the next time this project is published.
  v_snapshot := v_snapshot || jsonb_build_object(
    'submissions', jsonb_build_object(
      'issue', coalesce((v_config.fields->>'submissions_issue')::boolean, false),
      'change_request', coalesce((v_config.fields->>'submissions_change_request')::boolean, false),
      'question', coalesce((v_config.fields->>'submissions_question')::boolean, false)
    ),
    'submission_options', jsonb_build_object(
      'issue', jsonb_build_object(
        'category', (
          select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label) order by sort_order), '[]'::jsonb)
          from submission_taxonomy_options
          where workspace_id = v_project.workspace_id and kind = 'issue' and field = 'category' and is_active
        ),
        'severity', (
          select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label) order by sort_order), '[]'::jsonb)
          from submission_taxonomy_options
          where workspace_id = v_project.workspace_id and kind = 'issue' and field = 'severity' and is_active
        )
      ),
      'change_request', jsonb_build_object(
        'priority', (
          select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label) order by sort_order), '[]'::jsonb)
          from submission_taxonomy_options
          where workspace_id = v_project.workspace_id and kind = 'change_request' and field = 'priority' and is_active
        )
      )
    )
  );

  update client_view_configs
  set published_snapshot = v_snapshot, published_at = now(), published_by = p_published_by, updated_at = now()
  where project_id = p_project_id;

  perform fn_log_activity(
    v_project.workspace_id, p_published_by, 'delivery', 'publish', 'client_view_config', p_project_id,
    'Published client view for ' || v_project.name
  );

  return v_snapshot;
end;
$$;
