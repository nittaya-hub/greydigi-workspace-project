-- Client/public projections. Architecture doc section 8 and the P·1/Q spec
-- in chats/chat1.md: "Never expose unrestricted internal database records
-- directly to P·1", "Only explicitly client-visible/published data may
-- cross the boundary". Both functions are security definer so the
-- unauthenticated `anon` role can call them (grants below) without ever
-- being granted SELECT on the underlying internal tables.

-- Builds the frozen snapshot P·1 and (as a base) Q read. Only fields the
-- Client View Config toggles on are included. Called from the internal app
-- when a lead clicks "Publish" on Client View Config — never live.
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

-- P·1 entry point. Validates the token, marks lazily-expired links, logs
-- the view, and returns ONLY the frozen projection — never a live query
-- against internal tables. Call with the anon key from a server route.
create or replace function fn_public_share_view(p_token text, p_viewer_city text default null, p_viewer_country text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_snapshot jsonb;
begin
  select * into v_link from share_links where token = p_token;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_link.status = 'revoked' then
    return jsonb_build_object('state', 'revoked', 'revoked_at', v_link.revoked_at);
  end if;

  if v_link.expires_at is not null and v_link.expires_at < now() then
    if v_link.status <> 'expired' then
      update share_links set status = 'expired' where id = v_link.id;
    end if;
    return jsonb_build_object('state', 'expired', 'expired_at', v_link.expires_at);
  end if;

  select published_snapshot into v_snapshot
  from client_view_configs
  where project_id = v_link.project_id;

  if v_snapshot is null then
    return jsonb_build_object('state', 'error', 'reason', 'not_published');
  end if;

  insert into share_link_views (share_link_id, ip_city, ip_country)
  values (v_link.id, p_viewer_city, p_viewer_country);

  return jsonb_build_object('state', 'valid', 'data', v_snapshot, 'published_at', (
    select published_at from client_view_configs where project_id = v_link.project_id
  ));
end;
$$;

-- Q entry point. Unlike P·1, the client portal is authenticated and
-- interactive, so it reads live (not the frozen snapshot) — but still only
-- the fields Client View Config has toggled on, plus the client-scoped
-- action/approval/signature queues that make it a portal rather than a
-- read-only page. Call as the authenticated client user; RLS on the
-- underlying tables (client_roles-scoped policies in 0007) is the actual
-- enforcement boundary here, this function just shapes the response.
create or replace function fn_client_portal_project(p_project_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_config record;
  v_project record;
  v_result jsonb;
begin
  select * into v_config from client_view_configs where project_id = p_project_id;
  select p.*, c.name as client_name into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = p_project_id;

  if not found then
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

revoke all on function fn_public_share_view(text, text, text) from public;
grant execute on function fn_public_share_view(text, text, text) to anon, authenticated;

revoke all on function fn_client_portal_project(uuid) from public;
grant execute on function fn_client_portal_project(uuid) to authenticated;

revoke all on function fn_publish_client_view(uuid, uuid) from public;
grant execute on function fn_publish_client_view(uuid, uuid) to authenticated;
