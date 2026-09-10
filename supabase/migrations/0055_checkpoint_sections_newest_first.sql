-- 0054 aggregated the four Checkpoint blocks (progress_stats, decisions,
-- commitments, baseline_measures) with `order by created_at` (ascending),
-- so a freshly reviewed row landed at the BOTTOM of its section instead
-- of the top -- the same "newest first" bug already fixed on every
-- internal Checkpoint tab query (src/lib/data/project.ts). This applies
-- the same fix to the two RPCs that read those tables for the live and
-- published client view, by recreating each function with `desc` added
-- to those four order-by clauses. No other behavior changes.
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

  if coalesce((v_config.fields->>'progress_stats')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'progress_stats', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'label', label, 'value', value, 'note', note
        ) order by created_at desc), '[]'::jsonb)
        from project_progress_stats
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'decisions')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'decisions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'title', title, 'detail', detail, 'owner', owner,
          'due_label', due_label, 'status', status
        ) order by created_at desc), '[]'::jsonb)
        from project_decisions
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'commitments')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'commitments', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'period_label', period_label, 'owner_label', owner_label,
          'items', items, 'accent', accent
        ) order by created_at desc), '[]'::jsonb)
        from project_weekly_commitments
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'baseline_measures')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'baseline_measures', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'measure_name', measure_name, 'today_value', today_value,
          'after_value', after_value, 'baselined_when', baselined_when
        ) order by created_at desc), '[]'::jsonb)
        from project_baseline_measures
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;

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

  if coalesce((v_config.fields->>'progress_stats')::boolean, false) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'progress_stats', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'label', label, 'value', value, 'note', note
        ) order by created_at desc), '[]'::jsonb)
        from project_progress_stats
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'decisions')::boolean, false) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'decisions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'title', title, 'detail', detail, 'owner', owner,
          'due_label', due_label, 'status', status
        ) order by created_at desc), '[]'::jsonb)
        from project_decisions
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'commitments')::boolean, false) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'commitments', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'period_label', period_label, 'owner_label', owner_label,
          'items', items, 'accent', accent
        ) order by created_at desc), '[]'::jsonb)
        from project_weekly_commitments
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'baseline_measures')::boolean, false) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'baseline_measures', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'measure_name', measure_name, 'today_value', today_value,
          'after_value', after_value, 'baselined_when', baselined_when
        ) order by created_at desc), '[]'::jsonb)
        from project_baseline_measures
        where project_id = p_project_id and reviewed_at is not null
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
