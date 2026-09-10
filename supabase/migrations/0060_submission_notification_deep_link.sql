-- Every notification for a client submission (both public-link RPCs
-- here, and the four internal actions in
-- src/app/(app)/hypercare/submissions/actions.ts and
-- src/app/portal/[ref]/client-submission-actions.ts, already updated in
-- the same change) pointed related_url at the bare list page with no
-- id. Client submissions is unpaginated-looking but has 20-per-page
-- pagination, a search box and kind filter -- with no id to jump to,
-- clicking a notification landed on the list with nothing marking
-- which of (possibly several pages of) rows it was about. The app-code
-- side now reads a `?submission=<id>` query param to scroll to and
-- highlight that row; these two security-definer functions are the
-- only place left generating this link server-side, so they need the
-- same id appended.

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
  v_kind_label text;
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

  select p.*, c.id as client_id_resolved, c.name as client_name into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = v_link.project_id;

  insert into client_submissions (
    workspace_id, client_id, kind, category, severity, priority, title, description, business_impact, submitted_by
  ) values (
    v_project.workspace_id, v_project.client_id_resolved, p_kind, p_category, p_severity, p_priority,
    trim(p_title), trim(p_description), p_business_impact, null
  )
  returning id into v_submission_id;

  v_kind_label := case p_kind
    when 'issue' then 'Report an issue'
    when 'change_request' then 'Change request'
    else 'Question'
  end;

  insert into notifications (workspace_id, person_id, kind, title, body, related_url, actor_label)
  select
    v_project.workspace_id,
    people.id,
    'delivery_submission_' || p_kind::text,
    v_kind_label || ': ' || trim(p_title),
    v_project.client_name || ' submitted this from the delivery share link.',
    '/hypercare/submissions?submission=' || v_submission_id::text,
    v_project.client_name
  from people
  where people.workspace_id = v_project.workspace_id and people.kind = 'internal';

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id, 'workspace_id', v_project.workspace_id);
end;
$$;

revoke all on function fn_public_submit_client_submission(text, client_submission_kind, text, text, text, text, text, text) from public;
grant execute on function fn_public_submit_client_submission(text, client_submission_kind, text, text, text, text, text, text) to anon, authenticated;

create or replace function fn_public_submit_hypercare_submission(
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
  v_report record;
  v_client record;
  v_enabled boolean;
  v_submission_id uuid;
  v_kind_label text;
begin
  select * into v_report from hypercare_share_reports where token = p_token;
  if not found or v_report.status = 'revoked' then
    return jsonb_build_object('ok', false, 'message', 'This link is no longer valid.');
  end if;

  v_enabled := coalesce((v_report.snapshot #>> array['submissions', p_kind::text])::boolean, false);
  if not v_enabled then
    return jsonb_build_object('ok', false, 'message', 'This form is not currently enabled for this report.');
  end if;

  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_description), '') = '' then
    return jsonb_build_object('ok', false, 'message', 'Enter a title and description.');
  end if;

  select * into v_client from clients where id = v_report.client_id;

  insert into client_submissions (
    workspace_id, client_id, kind, category, severity, priority, title, description, business_impact, submitted_by
  ) values (
    v_client.workspace_id, v_client.id, p_kind, p_category, p_severity, p_priority,
    trim(p_title), trim(p_description), p_business_impact, null
  )
  returning id into v_submission_id;

  v_kind_label := case p_kind
    when 'issue' then 'Report an issue'
    when 'change_request' then 'Change request'
    else 'Question'
  end;

  insert into notifications (workspace_id, person_id, kind, title, body, related_url, actor_label)
  select
    v_client.workspace_id,
    people.id,
    'hypercare_submission_' || p_kind::text,
    v_kind_label || ': ' || trim(p_title),
    v_client.name || ' submitted this from the Hypercare report link.',
    '/hypercare/submissions?submission=' || v_submission_id::text,
    v_client.name
  from people
  where people.workspace_id = v_client.workspace_id and people.kind = 'internal';

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id, 'workspace_id', v_client.workspace_id);
end;
$$;

revoke all on function fn_public_submit_hypercare_submission(text, client_submission_kind, text, text, text, text, text, text) from public;
grant execute on function fn_public_submit_hypercare_submission(text, client_submission_kind, text, text, text, text, text, text) to anon, authenticated;
