-- Hand-curated Gantt timeline for the Checkpoint data tab (deck page 4:
-- "Ten weeks, three gates, where we stand at week N") -- deliberately
-- separate from the existing auto-derived Gantt in gantt.ts/GanttTimeline
-- (used on the project Overview tab and the client portal), which stays
-- exactly as it is: that one is real task/phase data with no manual
-- input, by design (see its own file header on why a hand-editable
-- version was rejected there). This is the opposite, explicit choice --
-- a person curates task-group rows and colors them in by hand, matching
-- the checkpoint deck exactly, same "type it in, review it, only
-- reviewed reaches the client" contract as every other Checkpoint
-- section (0054).
--
-- Four tables:
--   project_timeline_settings -- one row per project: how many weeks,
--     and the first week's start date, so headers read "W1, 24 Aug"
--     like the deck's own.
--   project_timeline_statuses -- the colour/style palette. Seeded with
--     the deck's own five (done/in progress/next/planned/go-live
--     window) the first time a project's timeline is touched, but a
--     person can add, recolour or delete any of them -- "add options,
--     highlight, fully" was the explicit ask, not a fixed five-way enum.
--   project_timeline_rows -- the task-group rows themselves (e.g.
--     "Order ingestion, landing then mapping"), with their own sort
--     order and a visible flag so a row can be hidden without deleting
--     it.
--   project_timeline_cells -- one row's status for one week, unique per
--     (row, week) so setting the same week twice updates it rather than
--     duplicating.

create table if not exists project_timeline_settings (
  project_id uuid primary key references projects (id) on delete cascade,
  week_count int not null default 10,
  week1_start_date date,
  updated_at timestamptz not null default now()
);

create table if not exists project_timeline_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  color_hex text not null,
  style text not null default 'filled' check (style in ('filled', 'outline')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_timeline_statuses_project_idx on project_timeline_statuses (project_id, sort_order);

create table if not exists project_timeline_rows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  reviewed_at timestamptz,
  reviewed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_timeline_rows_project_idx on project_timeline_rows (project_id, sort_order);

create table if not exists project_timeline_cells (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references project_timeline_rows (id) on delete cascade,
  week_index int not null check (week_index >= 0),
  status_id uuid references project_timeline_statuses (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (row_id, week_index)
);
create index if not exists project_timeline_cells_row_idx on project_timeline_cells (row_id);

alter table project_timeline_settings enable row level security;
alter table project_timeline_statuses enable row level security;
alter table project_timeline_rows enable row level security;
alter table project_timeline_cells enable row level security;

drop policy if exists project_timeline_settings_read on project_timeline_settings;
create policy project_timeline_settings_read on project_timeline_settings for select
  using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_timeline_settings_write on project_timeline_settings;
create policy project_timeline_settings_write on project_timeline_settings for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_timeline_statuses_read on project_timeline_statuses;
create policy project_timeline_statuses_read on project_timeline_statuses for select
  using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_timeline_statuses_write on project_timeline_statuses;
create policy project_timeline_statuses_write on project_timeline_statuses for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_timeline_rows_read on project_timeline_rows;
create policy project_timeline_rows_read on project_timeline_rows for select
  using (project_id in (select fn_my_accessible_project_ids()));
drop policy if exists project_timeline_rows_write on project_timeline_rows;
create policy project_timeline_rows_write on project_timeline_rows for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

-- Cells have no project_id of their own -- scoped through their row.
drop policy if exists project_timeline_cells_read on project_timeline_cells;
create policy project_timeline_cells_read on project_timeline_cells for select
  using (row_id in (select id from project_timeline_rows where project_id in (select fn_my_accessible_project_ids())));
drop policy if exists project_timeline_cells_write on project_timeline_cells;
create policy project_timeline_cells_write on project_timeline_cells for all
  using (row_id in (select id from project_timeline_rows where project_id in (select fn_my_admin_project_ids())))
  with check (row_id in (select id from project_timeline_rows where project_id in (select fn_my_admin_project_ids())));

-- Add the timeline section toggle to Client view config's own gated set,
-- matching progress_stats/decisions/commitments/baseline_measures
-- exactly -- default off (nothing to show until a person builds one).
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
        from project_baseline_measures
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  -- New: the hand-curated Gantt timeline, same reviewed_at gate as
  -- every other Checkpoint section. Nested rows carry each week's
  -- colour/label directly (rather than a separate lookup) so the
  -- portal never has to join back to project_timeline_statuses.
  if coalesce((v_config.fields->>'checkpoint_timeline')::boolean, false) then
    v_result := v_result || jsonb_build_object(
      'checkpoint_timeline', (
        select jsonb_build_object(
          'week_count', coalesce((select week_count from project_timeline_settings where project_id = p_project_id), 10),
          'week1_start_date', (select week1_start_date from project_timeline_settings where project_id = p_project_id),
          'rows', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'label', r.label,
              'cells', (
                select coalesce(jsonb_agg(jsonb_build_object(
                  'week_index', c.week_index,
                  'label', s.label,
                  'color_hex', s.color_hex,
                  'style', s.style
                )), '[]'::jsonb)
                from project_timeline_cells c
                join project_timeline_statuses s on s.id = c.status_id
                where c.row_id = r.id
              )
            ) order by r.sort_order), '[]'::jsonb)
            from project_timeline_rows r
            where r.project_id = p_project_id and r.visible = true and r.reviewed_at is not null
          )
        )
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;

-- Same new section on the frozen P·1 snapshot function, so publishing
-- doesn't silently drop the timeline even when its toggle is on.
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
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
        ) order by created_at), '[]'::jsonb)
        from project_baseline_measures
        where project_id = p_project_id and reviewed_at is not null
      )
    );
  end if;

  if coalesce((v_config.fields->>'checkpoint_timeline')::boolean, false) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'checkpoint_timeline', (
        select jsonb_build_object(
          'week_count', coalesce((select week_count from project_timeline_settings where project_id = p_project_id), 10),
          'week1_start_date', (select week1_start_date from project_timeline_settings where project_id = p_project_id),
          'rows', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'label', r.label,
              'cells', (
                select coalesce(jsonb_agg(jsonb_build_object(
                  'week_index', c.week_index,
                  'label', s.label,
                  'color_hex', s.color_hex,
                  'style', s.style
                )), '[]'::jsonb)
                from project_timeline_cells c
                join project_timeline_statuses s on s.id = c.status_id
                where c.row_id = r.id
              )
            ) order by r.sort_order), '[]'::jsonb)
            from project_timeline_rows r
            where r.project_id = p_project_id and r.visible = true and r.reviewed_at is not null
          )
        )
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

revoke all on function fn_publish_client_view(uuid, uuid) from public;
grant execute on function fn_publish_client_view(uuid, uuid) to authenticated;
