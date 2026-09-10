-- Populates the REAL client/project you created by hand through the app
-- (client "Nutrition Kitchen" / project ref "phase1") with the real
-- data from the 8 September 2026 NK Core checkpoint — the same content
-- supabase/seed_nk_live.sql carries for the separate NK-P1 seed project,
-- adapted to whatever phase/gate ids your own project already has
-- (found by lookup, never assumed).
--
-- Deliberately does NOT touch project_gates.status or
-- project_phases.started_at/completed_at directly -- those are derived,
-- never hand-set (see supabase/migrations/0006_state_engine.sql and
-- 0042_phase_progression_from_gates.sql). This only inserts the gate
-- CONDITIONS that are actually true as of the checkpoint; every insert
-- fires the recompute trigger, which cascades gate status and phase
-- dates automatically -- the same mechanism your own clicks on Flight
-- plan check use. Run 0042 before this file, or the phases won't move.
--
-- Safe to re-run: every insert is upsert-shaped or guarded.

begin;

do $$
declare
  v_workspace_id uuid;
  v_client_id uuid;
  v_project_id uuid;
  v_project_ref text;
  v_project_name text;
  v_lt_id uuid;
  v_tony_id uuid;

  v_pp03_id uuid; v_pp04_id uuid;
  v_pg1_id uuid; v_pg2_id uuid; v_pg3_id uuid; v_pg4_id uuid; v_pg5_id uuid;
begin
  select c.id, c.workspace_id into v_client_id, v_workspace_id
  from clients c where trim(lower(c.name)) = 'nutrition kitchen'
  order by c.created_at asc limit 1;
  if v_client_id is null then
    raise exception 'No client matching "Nutrition Kitchen" found.';
  end if;

  select id, ref, name into v_project_id, v_project_ref, v_project_name
  from projects where client_id = v_client_id and trim(lower(ref)) = 'phase1';
  if v_project_id is null then
    raise exception 'No project with ref "phase1" found under that client.';
  end if;

  -- People: reuse existing client-side contacts if already linked to
  -- this client (from your own setup); create them if not, matching the
  -- real names/roles from the signed contracts.
  select cr.person_id into v_lt_id
  from client_roles cr join people p on p.id = cr.person_id
  where cr.client_id = v_client_id and lower(p.full_name) like 'l%t%low%'
  limit 1;
  if v_lt_id is null then
    insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
    values (v_workspace_id, 'L.T. Low', 'ltlow@nutritionkitchensg.com', 'client', 'LL', 'client')
    on conflict (workspace_id, email) do update set full_name = excluded.full_name
    returning id into v_lt_id;
    insert into client_roles (person_id, client_id, role) values (v_lt_id, v_client_id, 'project_lead')
    on conflict (person_id, client_id) do nothing;
  end if;

  select cr.person_id into v_tony_id
  from client_roles cr join people p on p.id = cr.person_id
  where cr.client_id = v_client_id and lower(p.full_name) = 'tony'
  limit 1;
  if v_tony_id is null then
    insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
    values (v_workspace_id, 'Tony', 'tony@nutritionkitchen.example', 'client', 'TO', 'client')
    on conflict (workspace_id, email) do update set full_name = excluded.full_name
    returning id into v_tony_id;
    insert into client_roles (person_id, client_id, role) values (v_tony_id, v_client_id, 'schema_owner')
    on conflict (person_id, client_id) do nothing;
  end if;

  -- Description + go-live target -- safe to align, doesn't touch ref/URL.
  update projects set
    description = 'Order receipt to approved PO drafts, taken out of hand. Managed database on Tony''s schema, Shopify and Recurly API ingestion as the two order sources, automated BOM explosion and nested costing, PO drafts and kitchen documents, an approval gate, and the aironauts dashboard with multi-user access.',
    go_live_target = '2026-10-16'
  where id = v_project_id;

  select id into v_pp03_id from project_phases where project_id = v_project_id and index = 3;
  select id into v_pp04_id from project_phases where project_id = v_project_id and index = 4;
  select id into v_pg1_id from project_gates where project_id = v_project_id and code = 'G1';
  select id into v_pg2_id from project_gates where project_id = v_project_id and code = 'G2';
  select id into v_pg3_id from project_gates where project_id = v_project_id and code = 'G3';
  select id into v_pg4_id from project_gates where project_id = v_project_id and code = 'G4';
  select id into v_pg5_id from project_gates where project_id = v_project_id and code = 'G5';

  update project_gates set target_date = '2026-09-14' where id = v_pg3_id;
  update project_gates set target_date = '2026-10-16' where id = v_pg4_id;
  update project_gates set target_date = '2026-10-30' where id = v_pg5_id;

  -- Gate conditions as of the 8 Sep checkpoint: G1/G2 already true from
  -- the real signature date, G3's foundation landed early, G4/G5 still
  -- open -- inserting these fires the recompute trigger per row, which
  -- (with 0042 applied) cascades gate status and phase dates for real.
  delete from project_gate_conditions where project_gate_id in (v_pg1_id, v_pg2_id, v_pg3_id, v_pg4_id, v_pg5_id);
  insert into project_gate_conditions (project_gate_id, description, status, owner, sequence, met_at) values
    (v_pg1_id, 'Mission brief validated in the review call', 'met', 'client', 1, '2026-08-23'),
    (v_pg1_id, 'Indicative pricing given and accepted', 'met', 'client', 2, '2026-08-23'),
    (v_pg1_id, 'NDA signed', 'met', 'client', 3, '2026-08-23'),
    (v_pg2_id, 'Scope brief signed, carrying baseline and anticipated outcome', 'met', 'client', 1, '2026-08-23'),
    (v_pg2_id, 'Quote signed', 'met', 'client', 2, '2026-08-23'),
    (v_pg2_id, 'Agreement signed, with change-control terms', 'met', 'client', 3, '2026-08-23'),
    (v_pg3_id, 'Manifest v1 and foundation schema delivered, client-owned and portable', 'met', 'team', 1, '2026-09-04'),
    (v_pg3_id, 'Connector coverage met, source of truth live', 'met', 'team', 2, '2026-09-04'),
    (v_pg4_id, 'Go-live pack delivered: eval results, agent register, audit check, rollback plan', 'open', 'team', 1, null),
    (v_pg4_id, 'Human in the loop verified end to end on live data', 'open', 'team', 2, null),
    (v_pg5_id, 'Tie-out certificate signed, countersigned by client finance', 'open', 'client', 1, null),
    (v_pg5_id, 'Recommendation to scale, adjust or stop delivered', 'open', 'team', 2, null);

  -- Tasks: the real W1-W10 roadmap, reconciled against SOW-2026-001
  -- section 5 (same content as seed_nk_live.sql), refs prefixed with
  -- your own project's ref instead of "NK-P1".
  insert into project_tasks (project_id, project_phase_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id) values
    (v_project_id, v_pp04_id, v_project_ref || '-T01', 'Counterparts and deputies named, both sides', null, 'done', false, null, '2026-08-25', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T02', 'Scope boundary accepted, in scope against out of scope', null, 'done', false, null, '2026-08-25', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T03', 'Mobilise: environments provisioned, day-one access issued', 'Shopify and Recurly API credentials, Xero connection, FMP read access, environments, supplier master, data processing agreement.', 'done', true, null, '2026-08-30', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T04', 'Managed database and schema sign-off with Tony', 'Live on production since 4 September. Tony''s answers to kickoff questions 9-15 are in, unblocking product mapping.', 'done', true, null, '2026-09-07', v_tony_id),
    (v_project_id, v_pp04_id, v_project_ref || '-T05', 'Shopify and Recurly order ingestion: landing then mapping', 'Landing live; mapping into the kitchen''s master rows is under way. No manual export step from either source.', 'in_progress', true, null, '2026-09-13', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T06', 'BOM explosion, nested costing, PO drafting', 'Purchase orders, demand counts, and production runs. Queued next once T05 closes.', 'idle', true, null, '2026-09-20', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T07', 'Xero write-back and supplier records', null, 'idle', false, null, '2026-09-27', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T08', 'Approval gate, aironauts dashboard, multi-user access', 'Named approvers for the approval gate confirmed by NK, W4 to W5.', 'idle', false, null, '2026-09-27', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T09', 'PO dispatch and kitchen documents', 'The eleven documents: POs, receiving card, production sheet, recipe book, packing sheet, defrost plan, consumer labels, Xero bill batch, weekly Excel backup, spend/price/consumption exports.', 'idle', false, null, '2026-10-04', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T10', 'Parallel run, W7-W8: line by line reconciliation', 'Excel stays the system of record until both parallel weeks reconcile line by line.', 'idle', true, '2026-10-11', '2026-10-11', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T11', 'Cutover and first live release', 'M03. Named acceptance of cutover closes on a signature. Cutover moves with the Client''s Singapore audit date once confirmed.', 'idle', true, '2026-10-16', '2026-10-16', null),
    (v_project_id, (select id from project_phases where project_id = v_project_id and index = 5), v_project_ref || '-T12', 'Stabilisation, hypercare, handover pack', null, 'idle', false, null, '2026-10-26', null),
    (v_project_id, v_pp04_id, v_project_ref || '-T13', 'Continuity cover on the schema', 'A second name alongside Tony -- schema knowledge cannot sit with one person. Still unnamed.', 'waiting_on_client', true, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, v_project_ref || '-T14', 'Supplier contacts and current lead times', 'Needed for PO drafting and dispatch. Tracked against L.T. as the accountable owner.', 'waiting_on_client', false, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, v_project_ref || '-T15', 'Kitchen and procurement resource for W7 and W8', 'The heaviest ask in the plan -- both parallel weeks need real kitchen and procurement time.', 'waiting_on_client', false, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, v_project_ref || '-T16', 'Confirm Singapore audit dates', 'Cutover moves to the first Friday clear of the Client''s Singapore audit once confirmed. 16 October holds as the working target.', 'waiting_on_client', true, null, '2026-09-25', v_lt_id)
  on conflict (project_id, ref) do update set
    title = excluded.title, description = excluded.description, status = excluded.status,
    is_critical_path = excluded.is_critical_path, client_visible_date = excluded.client_visible_date,
    due_date = excluded.due_date, assignee_person_id = excluded.assignee_person_id;

  -- Payment milestones (SOW-2026-001 section 7).
  insert into project_tasks (project_id, project_phase_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id) values
    (v_project_id, v_pp03_id, v_project_ref || '-M01', 'M01 -- Commencement (SGD 9,400)', 'Released on MSA and SOW execution. Invoiced w/c 24 Aug 2026.', 'done', false, null, '2026-08-24', null),
    (v_project_id, v_pp03_id, v_project_ref || '-M02', 'M02 -- Mid-build (SGD 9,300)', 'Released when the managed database is live and Shopify/Recurly ingestion is running in test and accepted. Target w/c 14 Sep 2026.', 'idle', false, null, '2026-09-14', null),
    (v_project_id, v_pp04_id, v_project_ref || '-M03', 'M03 -- Singapore Go-Live (SGD 9,300)', 'Released when cutover is accepted and the approval gate is running in production. Target 16 Oct 2026. Total fixed fee: SGD 28,000 excl. GST.', 'idle', true, '2026-10-16', '2026-10-16', null)
  on conflict (project_id, ref) do update set
    title = excluded.title, description = excluded.description, status = excluded.status,
    is_critical_path = excluded.is_critical_path, client_visible_date = excluded.client_visible_date,
    due_date = excluded.due_date, assignee_person_id = excluded.assignee_person_id;

  -- Client updates: dated log entries.
  insert into client_updates (project_id, title, body, status, author_person_id, published_at)
  select v_project_id, 'Phase 1 kicked off, deploy sprint underway',
    'Kickoff held 25 August. Scope confirmed, counterparts named, and the day-one access list is out. The managed database and schema sign-off with Tony is the critical path for week one.',
    'published', null, '2026-08-25'
  where not exists (select 1 from client_updates where project_id = v_project_id and title = 'Phase 1 kicked off, deploy sprint underway');

  insert into client_updates (project_id, title, body, status, author_person_id, published_at)
  select v_project_id, 'Week 3 checkpoint: schema sign-off done, order ingestion under way',
    'Five migrations are on production since 4 September, and the costing engine matches Tony''s file on every golden case. Schema sign-off landed a week early. Order ingestion is now live and mapping is unblocked. BOM explosion and PO drafting are queued next. Cutover still holds at Friday 16 October.',
    'published', null, '2026-09-08'
  where not exists (select 1 from client_updates where project_id = v_project_id and title = 'Week 3 checkpoint: schema sign-off done, order ingestion under way');

  -- Client actions: two resolved, one still open.
  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'provide_information', 'Shopify, Recurly and Xero credentials',
    'API user in Xero (read/write), a private-app order token in Shopify, and Recurly API access, Singapore store.',
    'completed', v_lt_id, '2026-08-31 00:00:00+00', '2026-08-25 00:00:00+00'
  where not exists (select 1 from client_actions where project_id = v_project_id and title = 'Shopify, Recurly and Xero credentials');

  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'confirm_decision', 'Schema sign-off',
    'Tony to sign off the managed database schema, codes and yield logic.',
    'completed', v_tony_id, '2026-09-07 00:00:00+00', '2026-08-25 00:00:00+00'
  where not exists (select 1 from client_actions where project_id = v_project_id and title = 'Schema sign-off');

  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'confirm_decision', 'Continuity cover on the schema',
    'A second name alongside Tony for schema knowledge, so it never sits with one person.',
    'pending', v_lt_id, '2026-09-18 00:00:00+00', '2026-09-08 00:00:00+00'
  where not exists (select 1 from client_actions where project_id = v_project_id and title = 'Continuity cover on the schema');

  raise notice 'Updated project % (%) under client Nutrition Kitchen.', v_project_name, v_project_ref;
end $$;

commit;
