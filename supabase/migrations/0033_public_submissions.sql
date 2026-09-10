-- Lets a client submit "Report an issue" / "Change request" / "Ask a
-- question" from the PUBLIC share link (/s/[token]), not just the
-- authenticated portal (/portal/[ref]). /s/[token] has no signed-in user at
-- all -- same anonymous model as fn_public_share_view -- so this needs its
-- own security-definer write path, gated by the same three things every
-- other public projection is gated by: a valid, non-revoked, non-expired
-- share_links token, AND the project having actually published that
-- specific submission kind as enabled (client_view_configs.fields), never a
-- live check against internal state the client shouldn't see.
--
-- The category/severity/priority option lists are the same
-- submission_taxonomy_options an admin manages under Settings -> Submission
-- types -- baked into the published snapshot below so /s/[token] never
-- needs its own read path into that table (which, being internal/client-
-- role-gated, an anonymous visitor couldn't read anyway).

-- 1. Extend the published snapshot with which kinds are enabled and their
-- option lists, so /s/[token] knows what to show without a live query.
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

  if (v_config.fields->>'status')::boolean then
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

  if (v_config.fields->>'timeline')::boolean then
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

  if (v_config.fields->>'milestones')::boolean then
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

  if (v_config.fields->>'updates')::boolean then
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

  if (v_config.fields->>'documents')::boolean then
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

-- 2. Anonymous submission entry point. Re-validates the token exactly like
-- fn_public_share_view (revoked/expired/invalid all return the same shape
-- of result), then re-checks the kind is enabled in the FROZEN published
-- snapshot -- not the live client_view_configs.fields -- so a submission
-- can never be filed for a section that isn't currently showing on the
-- page the visitor is actually looking at.
create or replace function fn_public_submit_client_submission(
  p_token text,
  p_kind client_submission_kind,
  p_title text,
  p_description text,
  p_category text default null,
  p_severity text default null,
  p_priority text default null,
  p_business_impact text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_snapshot jsonb;
  v_project record;
  v_enabled boolean;
  v_submission_id uuid;
begin
  select * into v_link from share_links where token = p_token;
  if not found or v_link.status = 'revoked' then
    return jsonb_build_object('ok', false, 'message', 'This link is no longer valid.');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'message', 'This link has expired.');
  end if;

  select published_snapshot into v_snapshot from client_view_configs where project_id = v_link.project_id;
  if v_snapshot is null then
    return jsonb_build_object('ok', false, 'message', 'This project has not been published.');
  end if;

  v_enabled := coalesce((v_snapshot #>> array['submissions', p_kind::text])::boolean, false);
  if not v_enabled then
    return jsonb_build_object('ok', false, 'message', 'This form is not currently enabled for this project.');
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_description), '') = '' then
    return jsonb_build_object('ok', false, 'message', 'Enter a title and description.');
  end if;

  select p.*, c.id as client_id_resolved into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = v_link.project_id;

  insert into client_submissions (
    workspace_id, client_id, kind, category, severity, priority, title, description, business_impact, submitted_by
  ) values (
    v_project.workspace_id, v_project.client_id_resolved, p_kind, p_category, p_severity, p_priority,
    trim(p_title), trim(p_description), p_business_impact, null
  )
  returning id into v_submission_id;

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id, 'workspace_id', v_project.workspace_id);
end;
$$;

revoke all on function fn_public_submit_client_submission(text, client_submission_kind, text, text, text, text, text, text) from public;
grant execute on function fn_public_submit_client_submission(text, client_submission_kind, text, text, text, text, text, text) to anon, authenticated;
