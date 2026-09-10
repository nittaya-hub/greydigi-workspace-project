-- The fortnightly checkpoint deck shared with clients (see the
-- NK_Core_checkpoint PDF, 2026-09-08/09) carries four kinds of content
-- that Client View Config has never had a section for, because none of
-- it has ever had a table to read from: build-progress stat tiles ("5 of
-- 9 migrations", "40,336 rows loaded"), a decisions log with an owner
-- and a date, this-week/next-week commitments from both sides, and a
-- before/after baseline measures table. Each gets its own small table,
-- following the same shape as every other admin-entered, client-gated
-- list in this schema (baselines, change_requests): internal-only RLS
-- (fn_my_accessible_project_ids to read, fn_my_admin_project_ids to
-- write), no client-facing grant -- the client only ever sees this
-- through fn_client_portal_project / fn_publish_client_view, same
-- boundary as everything else on the portal.
--
-- None of these four numbers has a real upstream source inside this
-- Supabase project to refresh itself from -- "40,336 rows loaded" and
-- "139/139 costing tests pass" live in Tony's migration and costing
-- tooling entirely outside this app, so there is no nightly job that
-- could recompute them here without a real integration into that
-- tooling (a separate, much larger project of its own). What IS
-- buildable, and is what this migration adds instead: every row carries
-- reviewed_at/reviewed_by, null until someone marks it checked. Both
-- fn_client_portal_project (the live, authenticated portal) and
-- fn_publish_client_view (the frozen P.1 snapshot) only ever select
-- reviewed_at is not null rows -- so typing a fresh number into the
-- Checkpoint tab in the morning never reaches a client, live or
-- published, until a reviewer explicitly approves it.
create table project_progress_stats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  value text not null,
  note text,
  reviewed_at timestamptz,
  reviewed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_progress_stats_project_idx on project_progress_stats (project_id, created_at);

create table project_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  detail text,
  owner text,
  due_label text,
  status text not null default 'open' check (status in ('open', 'closed')),
  reviewed_at timestamptz,
  reviewed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_decisions_project_idx on project_decisions (project_id, created_at);

create table project_weekly_commitments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  period_label text not null,
  owner_label text not null,
  items jsonb not null default '[]'::jsonb,
  accent boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_weekly_commitments_project_idx on project_weekly_commitments (project_id, created_at);

create table project_baseline_measures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  measure_name text not null,
  today_value text not null,
  after_value text not null,
  baselined_when text,
  reviewed_at timestamptz,
  reviewed_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_baseline_measures_project_idx on project_baseline_measures (project_id, created_at);

alter table project_progress_stats enable row level security;
create policy project_progress_stats_read on project_progress_stats for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_progress_stats_insert on project_progress_stats for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_progress_stats_update on project_progress_stats for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_progress_stats_delete on project_progress_stats for delete
  using (project_id in (select fn_my_admin_project_ids()));

alter table project_decisions enable row level security;
create policy project_decisions_read on project_decisions for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_decisions_insert on project_decisions for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_decisions_update on project_decisions for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_decisions_delete on project_decisions for delete
  using (project_id in (select fn_my_admin_project_ids()));

alter table project_weekly_commitments enable row level security;
create policy project_weekly_commitments_read on project_weekly_commitments for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_weekly_commitments_insert on project_weekly_commitments for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_weekly_commitments_update on project_weekly_commitments for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_weekly_commitments_delete on project_weekly_commitments for delete
  using (project_id in (select fn_my_admin_project_ids()));

alter table project_baseline_measures enable row level security;
create policy project_baseline_measures_read on project_baseline_measures for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_baseline_measures_insert on project_baseline_measures for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_baseline_measures_update on project_baseline_measures for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_baseline_measures_delete on project_baseline_measures for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- Four new toggle-gated blocks, all defaulting OFF like 'gantt' was in
-- 0044 -- every existing project has empty tables for these until an
-- admin fills in the Checkpoint tab, so there's nothing to show yet and
-- no reason to surface an empty section by default. Each block also
-- filters to reviewed_at is not null -- see the reviewed_at comment
-- above; an unreviewed row sits in the Checkpoint tab but never reaches
-- this function's result.
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
