-- Hypercare's own "Client view config" + "Share links", deliberately
-- separate from Delivery's (client-view-config, share_links,
-- client_view_configs) rather than reusing them -- the request was
-- explicit: keep the two pages apart so a team member editing one can
-- never confuse it for the other. Hypercare is client-level, not
-- project-level (a client can have delivery projects and one Hypercare
-- service at the same time), so these key off client_id directly rather
-- than project_id the way Delivery's do.
--
-- Reports are periodic snapshots, not one ever-overwritten "current"
-- row like Delivery's P·1: each publish is its own row with its own
-- period (period_start/period_end) and its own token, so last week's
-- report keeps working as a link after this week's is published. This
-- mirrors the explicit ask: "เลือกช่วงเวลาได้ เหมือน snapshot เป็น
-- ทางการของสัปดาห์นั้นๆ" (period-selectable, an official snapshot for
-- that week).
--
-- The three submission cards (Report an issue / Change request / Ask a
-- question) move here from Delivery's Client View Config and become
-- public, no-login forms on the Hypercare report link -- per the
-- decision this session to stop routing client-facing work through
-- login in practice (the login system itself stays, just unused day to
-- day). client_submissions already keys off client_id directly (not
-- project_id), so nothing there needs to change -- only where the
-- submit entry point lives.

create table hypercare_view_configs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients (id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table hypercare_share_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  token text not null unique,
  status share_link_status not null default 'active',
  snapshot jsonb not null,
  published_by uuid references people (id) on delete set null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (period_end >= period_start)
);
create index hypercare_share_reports_client_idx on hypercare_share_reports (client_id, period_start desc);

alter table hypercare_view_configs enable row level security;
alter table hypercare_share_reports enable row level security;

create policy hypercare_view_configs_internal on hypercare_view_configs for all
  using (client_id in (select id from clients where workspace_id in (select fn_my_internal_workspace_ids())));

create policy hypercare_share_reports_internal on hypercare_share_reports for all
  using (client_id in (select id from clients where workspace_id in (select fn_my_internal_workspace_ids())));

-- Every key defaults true except the three submission cards (default
-- false, same reasoning as Delivery's: they open a public write path, so
-- an admin has to deliberately turn each one on) -- and every default is
-- coalesce(...,true/false) from the very first version of this function,
-- never the "fields is null or ..." pattern that silently broke five
-- sections in fn_client_portal_project (0043) and fn_publish_client_view
-- (0045) the first time anyone saved a single toggle.
create or replace function fn_publish_hypercare_report(
  p_client_id uuid,
  p_period_start date,
  p_period_end date,
  p_published_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_client record;
  v_snapshot jsonb;
  v_token text;
  v_report_id uuid;
begin
  select * into v_config from hypercare_view_configs where client_id = p_client_id;
  if not found then
    insert into hypercare_view_configs (client_id) values (p_client_id) returning * into v_config;
  end if;

  select * into v_client from clients where id = p_client_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Client not found.');
  end if;

  v_snapshot := jsonb_build_object(
    'client_name', v_client.name,
    'period_start', p_period_start,
    'period_end', p_period_end
  );

  if coalesce((v_config.fields->>'services_summary')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'services', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', ref, 'name', name, 'health', health, 'live_since', live_since
        ) order by ref), '[]'::jsonb)
        from services where client_id = p_client_id
      )
    );
  end if;

  if coalesce((v_config.fields->>'incidents_summary')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'incidents', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', i.ref, 'title', i.title, 'severity', i.severity, 'status', i.status,
          'opened_at', i.opened_at, 'resolved_at', i.resolved_at, 'breach_at', i.breach_at
        ) order by i.opened_at desc), '[]'::jsonb)
        from incidents i
        join services s on s.id = i.service_id
        where s.client_id = p_client_id
          and i.opened_at >= p_period_start and i.opened_at < (p_period_end + 1)
      )
    );
  end if;

  if coalesce((v_config.fields->>'sla_status')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'sla_tiers', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'service_ref', s.ref, 'severity', spt.severity,
          'response_target_minutes', spt.response_target_minutes,
          'update_cadence_minutes', spt.update_cadence_minutes
        ) order by s.ref, spt.severity), '[]'::jsonb)
        from sla_policy_tiers spt
        join sla_policies sp on sp.id = spt.sla_policy_id
        join services s on s.id = sp.service_id
        where s.client_id = p_client_id
      )
    );
  end if;

  if coalesce((v_config.fields->>'request_backlog')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'request_backlog', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ref', r.ref, 'title', r.title, 'status', r.status, 'opened_at', r.opened_at
        ) order by r.opened_at desc), '[]'::jsonb)
        from support_requests r
        join services s on s.id = r.service_id
        -- support_request_status is ('open','in_progress','done') --
        -- there is no 'closed' value; that literal would have thrown
        -- "invalid input value for enum" the first time this ran.
        where s.client_id = p_client_id and r.status <> 'done'
      )
    );
  end if;

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
          where workspace_id = v_client.workspace_id and kind = 'issue' and field = 'category' and is_active
        ),
        'severity', (
          select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label) order by sort_order), '[]'::jsonb)
          from submission_taxonomy_options
          where workspace_id = v_client.workspace_id and kind = 'issue' and field = 'severity' and is_active
        )
      ),
      'change_request', jsonb_build_object(
        'priority', (
          select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label) order by sort_order), '[]'::jsonb)
          from submission_taxonomy_options
          where workspace_id = v_client.workspace_id and kind = 'change_request' and field = 'priority' and is_active
        )
      )
    )
  );

  v_token := encode(gen_random_bytes(18), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');

  insert into hypercare_share_reports (client_id, period_start, period_end, token, snapshot, published_by)
  values (p_client_id, p_period_start, p_period_end, v_token, v_snapshot, p_published_by)
  returning id into v_report_id;

  perform fn_log_activity(
    v_client.workspace_id, p_published_by, 'hypercare', 'publish', 'hypercare_share_reports', v_report_id,
    'Published Hypercare report for ' || v_client.name || ' (' || p_period_start || ' to ' || p_period_end || ')'
  );

  return jsonb_build_object('ok', true, 'report_id', v_report_id, 'token', v_token);
end;
$$;

revoke all on function fn_publish_hypercare_report(uuid, date, date, uuid) from public;
grant execute on function fn_publish_hypercare_report(uuid, date, date, uuid) to authenticated;

-- Public read, no login -- mirrors fn_public_share_view exactly (same
-- valid/revoked/expired/invalid state shape) but resolves straight off
-- hypercare_share_reports.token instead of a project-scoped share link.
create or replace function fn_public_hypercare_report_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report record;
begin
  select * into v_report from hypercare_share_reports where token = p_token;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_report.status = 'revoked' then
    return jsonb_build_object('state', 'revoked', 'revoked_at', v_report.revoked_at);
  end if;

  return jsonb_build_object('state', 'valid', 'data', v_report.snapshot, 'published_at', v_report.published_at);
end;
$$;

revoke all on function fn_public_hypercare_report_view(text) from public;
grant execute on function fn_public_hypercare_report_view(text) to anon, authenticated;

-- Anonymous submission entry point for the Hypercare report link -- exact
-- mirror of fn_public_submit_client_submission (0033), re-checking the
-- kind is enabled in the FROZEN snapshot the visitor is actually looking
-- at, not the live config, and resolving client_id off the report's own
-- token instead of a project's share link.
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

  return jsonb_build_object('ok', true, 'submission_id', v_submission_id);
end;
$$;

revoke all on function fn_public_submit_hypercare_submission(text, client_submission_kind, text, text, text, text, text, text) from public;
grant execute on function fn_public_submit_hypercare_submission(text, client_submission_kind, text, text, text, text, text, text) to anon, authenticated;
