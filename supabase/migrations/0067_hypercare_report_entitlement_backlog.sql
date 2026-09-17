-- Hypercare wave 4.5 (Review & client view): the service review pack is
-- missing two sections the blueprint names explicitly -- an entitlement
-- bar and the improvement backlog -- even though both objects it reads
-- from (entitlement_periods/fn_entitlement_consumed, improvement_items)
-- have existed since 0064. This adds them as two more toggleable
-- sections, following 0046/0047's own pattern exactly: default true,
-- coalesce(...,true) so an existing hypercare_view_configs row with
-- neither key set still shows both sections rather than hiding them.
--
-- Value metrics at +30/+90 days are NOT added here -- there is no
-- "Outcome" object anywhere in this schema to read a baseline from (see
-- the Mission Control map's own decision on this), so adding a value
-- metrics section now would mean inventing numbers. Left out on purpose.
--
-- Entitlement is reported per service under the client, matched to
-- whichever entitlement_periods row overlaps the report's own
-- [period_start, period_end] range -- not "whatever covers today", since
-- a report can be for a past period. A service with no matching period
-- (none opened yet) is simply omitted, not shown as zeroed.

create or replace function fn_publish_hypercare_report(
  p_client_id uuid,
  p_period_start date,
  p_period_end date,
  p_published_by uuid,
  p_token text
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
        where s.client_id = p_client_id and r.status <> 'done'
      )
    );
  end if;

  if coalesce((v_config.fields->>'entitlement_summary')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'entitlement', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'service_ref', s.ref, 'service_name', s.name,
          'period_start', ep.period_start, 'period_end', ep.period_end,
          'included_units', ep.included_units, 'consumed_units', fn_entitlement_consumed(ep.id),
          'overage_units', greatest(fn_entitlement_consumed(ep.id) - ep.included_units, 0),
          'overage_billed', ep.overage_billed, 'overage_absorbed', ep.overage_absorbed
        ) order by s.ref), '[]'::jsonb)
        from entitlement_periods ep
        join services s on s.id = ep.service_id
        where s.client_id = p_client_id
          and ep.period_start <= p_period_end and ep.period_end >= p_period_start
      )
    );
  end if;

  if coalesce((v_config.fields->>'improvement_backlog')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'improvement_backlog', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'pattern', ii.pattern, 'frequency', ii.frequency, 'proposed_fix', ii.proposed_fix
        ) order by ii.frequency desc, ii.created_at desc), '[]'::jsonb)
        from improvement_items ii
        join services s on s.id = ii.service_id
        where s.client_id = p_client_id and ii.status = 'open'
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

  insert into hypercare_share_reports (client_id, period_start, period_end, token, snapshot, published_by)
  values (p_client_id, p_period_start, p_period_end, p_token, v_snapshot, p_published_by)
  returning id into v_report_id;

  perform fn_log_activity(
    v_client.workspace_id, p_published_by, 'hypercare', 'publish', 'hypercare_share_reports', v_report_id,
    'Published Hypercare report for ' || v_client.name || ' (' || p_period_start || ' to ' || p_period_end || ')'
  );

  return jsonb_build_object('ok', true, 'report_id', v_report_id, 'token', p_token);
end;
$$;

revoke all on function fn_publish_hypercare_report(uuid, date, date, uuid, text) from public;
grant execute on function fn_publish_hypercare_report(uuid, date, date, uuid, text) to authenticated;

create or replace function fn_preview_hypercare_report(
  p_client_id uuid,
  p_period_start date,
  p_period_end date
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
begin
  select * into v_config from hypercare_view_configs where client_id = p_client_id;

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
        where s.client_id = p_client_id and r.status <> 'done'
      )
    );
  end if;

  if coalesce((v_config.fields->>'entitlement_summary')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'entitlement', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'service_ref', s.ref, 'service_name', s.name,
          'period_start', ep.period_start, 'period_end', ep.period_end,
          'included_units', ep.included_units, 'consumed_units', fn_entitlement_consumed(ep.id),
          'overage_units', greatest(fn_entitlement_consumed(ep.id) - ep.included_units, 0),
          'overage_billed', ep.overage_billed, 'overage_absorbed', ep.overage_absorbed
        ) order by s.ref), '[]'::jsonb)
        from entitlement_periods ep
        join services s on s.id = ep.service_id
        where s.client_id = p_client_id
          and ep.period_start <= p_period_end and ep.period_end >= p_period_start
      )
    );
  end if;

  if coalesce((v_config.fields->>'improvement_backlog')::boolean, true) then
    v_snapshot := v_snapshot || jsonb_build_object(
      'improvement_backlog', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'pattern', ii.pattern, 'frequency', ii.frequency, 'proposed_fix', ii.proposed_fix
        ) order by ii.frequency desc, ii.created_at desc), '[]'::jsonb)
        from improvement_items ii
        join services s on s.id = ii.service_id
        where s.client_id = p_client_id and ii.status = 'open'
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
      'issue', jsonb_build_object('category', '[]'::jsonb, 'severity', '[]'::jsonb),
      'change_request', jsonb_build_object('priority', '[]'::jsonb)
    )
  );

  return jsonb_build_object('ok', true, 'data', v_snapshot);
end;
$$;

revoke all on function fn_preview_hypercare_report(uuid, date, date) from public;
grant execute on function fn_preview_hypercare_report(uuid, date, date) to authenticated;
