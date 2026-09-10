-- Cleans up the old placeholder client submissions ("Report an issue —
-- test", "Change request — test2" x2, "Question — test3") and replaces
-- them with fresh sample data that actually exercises case tracking
-- (assignee, internal reply thread, "needs to notify client" flag --
-- migration 0056_submission_case_tracking.sql) end to end, instead of
-- three empty rows nobody would ever touch. Same client-lookup pattern
-- as seed_nk_hypercare_test.sql: looks up "Nutrition Kitchen" by name
-- (case/whitespace-insensitive), falls back to that client's only
-- project if its ref isn't 'phase1'. Safe to run again -- the delete is
-- scoped to titles that are exact matches for the old placeholders, and
-- the insert always creates new rows rather than upserting, so running
-- this twice just adds a second batch of fresh sample rows (delete the
-- old placeholders once; re-running only adds more samples, it never
-- re-deletes what it already cleaned up).

begin;

do $$
declare
  v_workspace_id uuid;
  v_client_id uuid;
  v_client_name text;
  v_project_id uuid;
  v_project_count int;
  v_service_id uuid;
  v_internal_person_id uuid;
  v_deleted_count int;
begin
  select c.id, c.workspace_id, c.name into v_client_id, v_workspace_id, v_client_name
  from clients c
  where trim(lower(c.name)) = 'nutrition kitchen'
  order by c.created_at asc
  limit 1;

  if v_client_id is null then
    raise exception 'No client matching "Nutrition Kitchen" found in any workspace. Check the exact name in Clients and tell me what it is.';
  end if;

  select p.id into v_project_id
  from projects p
  where p.client_id = v_client_id and trim(lower(p.ref)) = 'phase1';

  if v_project_id is null then
    select count(*) into v_project_count from projects where client_id = v_client_id;
    if v_project_count = 1 then
      select p.id into v_project_id from projects p where p.client_id = v_client_id;
    else
      raise exception 'Client "%" has % project(s) and none has ref "phase1". Tell me the exact ref.', v_client_name, v_project_count;
    end if;
  end if;

  select id into v_service_id from services where origin_project_id = v_project_id;

  -- Any internal workspace member, to demo the assignee + notify-client
  -- flag with a real name instead of "Unassigned" on every row.
  select id into v_internal_person_id
  from people
  where workspace_id = v_workspace_id and kind = 'internal'
  order by created_at asc
  limit 1;

  delete from client_submissions
  where client_id = v_client_id
    and title in ('Report an issue — test', 'Change request — test2', 'Question — test3');
  get diagnostics v_deleted_count = row_count;
  raise notice 'Deleted % old placeholder submission(s).', v_deleted_count;

  insert into client_submissions
    (workspace_id, client_id, service_id, kind, category, severity, title, description, business_impact, status, assignee_person_id, needs_client_notice)
  values
    (
      v_workspace_id, v_client_id, v_service_id, 'issue', 'data_sync', 'sev2',
      'Purchase order totals off by rounding',
      'Two POs synced from the ERP this week show a 0.01-0.03 unit discrepancy against what''s shown in the portal. Looks like a rounding-mode mismatch between the two systems, not a data-loss issue.',
      'Finance is manually re-checking every PO total before approval until this is confirmed fixed, adding roughly 10 minutes per PO.',
      'in_progress', v_internal_person_id, true
    ),
    (
      v_workspace_id, v_client_id, v_service_id, 'change_request', null, null,
      'Add a second approver for POs over $5,000',
      'Ops wants a second sign-off step on any purchase order above $5,000, on top of the existing single-approver flow.',
      null,
      'open', null, false
    ),
    (
      v_workspace_id, v_client_id, v_service_id, 'question', null, null,
      'How long is uploaded document history kept?',
      'A user asked whether documents uploaded to the portal are ever purged, and if so, after how long.',
      null,
      'resolved', v_internal_person_id, false
    );

  raise notice 'Inserted 3 fresh sample submissions for client % (project %).', v_client_name, v_project_id;
end $$;

commit;
