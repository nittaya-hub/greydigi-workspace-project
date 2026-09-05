-- Realistic seed portfolio matching the Claude Design mockups: Nutrition
-- Kitchen, Halcyon Freight, Beacon Dental Group, Ridgeline Outdoor. Refs
-- (NK-M01, INC-114, r4.1, ...) cross-reference the same way they do in the
-- design source so a record can be traced end to end. Not "mock data" in
-- the sense the architecture doc warns against (section 16) — this is
-- real rows in real tables, computed live by the state engine, meant to
-- seed a working dev/demo database, not to fake a dashboard number.

begin;

insert into workspaces (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'greydigi delivery', 'greydigi-delivery');

-- People -----------------------------------------------------------------
insert into people (id, workspace_id, full_name, email, kind, avatar_initials, workspace_role) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Nittaya Prakham', 'nittaya@greydigi.com', 'internal', 'NI', 'workspace_admin'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Orhan Yilmaz', 'orhan@greydigi.com', 'internal', 'OY', 'delivery_lead'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Manh Tran', 'manh@greydigi.com', 'internal', 'MT', 'member'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Jun Kith Ng', 'jun@greydigi.com', 'internal', 'JN', 'hypercare_lead'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'Chris Schuler', 'chris@greydigi.com', 'internal', 'CS', 'product_lead');

insert into space_roles (person_id, space, role) values
  ('00000000-0000-0000-0000-000000000102', 'delivery', 'lead'),
  ('00000000-0000-0000-0000-000000000104', 'hypercare', 'lead'),
  ('00000000-0000-0000-0000-000000000105', 'product', 'lead');

-- Clients ------------------------------------------------------------------
insert into clients (id, workspace_id, name, client_since) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Nutrition Kitchen', '2026-08-14'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Halcyon Freight', '2026-05-02'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Beacon Dental Group', '2026-06-20'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Ridgeline Outdoor', '2026-03-11');

-- Template: Automation delivery, standard v3.2 (locked) ---------------------
insert into templates (id, workspace_id, name) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Automation delivery, standard');

insert into template_versions (id, template_id, version, is_locked, locked_at) values
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000301', 'v3.2', true, '2026-07-01');

insert into template_phases (id, template_version_id, index, code, name) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000302', 0, '00', 'Intake'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000302', 1, '01', 'Discovery'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000302', 2, '02', 'Design'),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000302', 3, '03', 'Build'),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000302', 4, '04', 'Test'),
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000302', 5, '05', 'Go live'),
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000302', 6, '06', 'Handover');

insert into template_gates (id, template_version_id, template_phase_id, code, name, sequence) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000402', 'G1', 'Discovery complete', 1),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000403', 'G2', 'Scope agreed', 2),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000404', 'G3', 'Foundation ready', 3),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000405', 'G4', 'Test complete', 4),
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000406', 'G5', 'Go live', 5);

-- 19 conditions across 5 gates (design source, screen "Gate conditions").
insert into template_gate_conditions (template_gate_id, description, requires_signature, sequence) values
  ('00000000-0000-0000-0000-000000000501', 'Discovery workshop completed', false, 1),
  ('00000000-0000-0000-0000-000000000501', 'Current-state process mapped', false, 2),
  ('00000000-0000-0000-0000-000000000501', 'Success metrics agreed with client', true, 3),
  ('00000000-0000-0000-0000-000000000502', 'Manifest v1 signed', true, 1),
  ('00000000-0000-0000-0000-000000000502', 'Baseline v1 approved', true, 2),
  ('00000000-0000-0000-0000-000000000502', 'Integration design reviewed', false, 3),
  ('00000000-0000-0000-0000-000000000502', 'Data mapping confirmed', false, 4),
  ('00000000-0000-0000-0000-000000000503', 'Manifest v2 signed', true, 1),
  ('00000000-0000-0000-0000-000000000503', 'Integration design reviewed', false, 2),
  ('00000000-0000-0000-0000-000000000503', 'Test data set agreed', false, 3),
  ('00000000-0000-0000-0000-000000000503', 'Client access confirmed', true, 4),
  ('00000000-0000-0000-0000-000000000503', 'Client sign off on output format', true, 5),
  ('00000000-0000-0000-0000-000000000504', 'UAT completed', false, 1),
  ('00000000-0000-0000-0000-000000000504', 'Defect backlog cleared', false, 2),
  ('00000000-0000-0000-0000-000000000504', 'Performance test passed', false, 3),
  ('00000000-0000-0000-0000-000000000504', 'Client review booked', true, 4),
  ('00000000-0000-0000-0000-000000000505', 'Runbook delivered', false, 1),
  ('00000000-0000-0000-0000-000000000505', 'Hypercare handover signed', true, 2),
  ('00000000-0000-0000-0000-000000000505', 'Client training complete', false, 3);

-- Project NK-M01: Order to kitchen automation --------------------------------
insert into projects (id, workspace_id, client_id, ref, name, description, template_version_id, lead_person_id, go_live_target) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201',
   'NK-M01', 'Order to kitchen automation',
   'Shopify orders into the kitchen production list without manual re-entry, with a daily prep sheet the kitchen actually uses.',
   '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '2026-11-14');

insert into project_phases (id, project_id, template_phase_id, index, code, name, started_at, completed_at) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000401', 0, '00', 'Intake', '2026-08-01', '2026-08-05'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000402', 1, '01', 'Discovery', '2026-08-05', '2026-08-12'),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000403', 2, '02', 'Design', '2026-08-12', '2026-08-22'),
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000404', 3, '03', 'Build', '2026-08-22', null),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000405', 4, '04', 'Test', null, null),
  ('00000000-0000-0000-0000-000000000706', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000406', 5, '05', 'Go live', null, null),
  ('00000000-0000-0000-0000-000000000707', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000407', 6, '06', 'Handover', null, null);

insert into project_gates (id, project_id, project_phase_id, template_gate_id, code, name, sequence, target_date) values
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000501', 'G1', 'Discovery complete', 1, '2026-08-12'),
  ('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000502', 'G2', 'Scope agreed', 2, '2026-08-22'),
  ('00000000-0000-0000-0000-000000000803', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000503', 'G3', 'Foundation ready', 3, '2026-08-28'),
  ('00000000-0000-0000-0000-000000000804', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000504', 'G4', 'Test complete', 4, '2026-10-16'),
  ('00000000-0000-0000-0000-000000000805', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000706', '00000000-0000-0000-0000-000000000505', 'G5', 'Go live', 5, '2026-11-14');

-- G1, G2 cleared. G3 held: 3 conditions met, 2 open (both on the client).
insert into project_gate_conditions (project_gate_id, description, status, owner, sequence, met_at) values
  ('00000000-0000-0000-0000-000000000801', 'Discovery workshop completed', 'met', 'team', 1, '2026-08-08'),
  ('00000000-0000-0000-0000-000000000801', 'Current-state process mapped', 'met', 'team', 2, '2026-08-10'),
  ('00000000-0000-0000-0000-000000000801', 'Success metrics agreed with client', 'met', 'client', 3, '2026-08-12'),
  ('00000000-0000-0000-0000-000000000802', 'Manifest v1 signed', 'met', 'client', 1, '2026-08-18'),
  ('00000000-0000-0000-0000-000000000802', 'Baseline v1 approved', 'met', 'client', 2, '2026-08-19'),
  ('00000000-0000-0000-0000-000000000802', 'Integration design reviewed', 'met', 'team', 3, '2026-08-20'),
  ('00000000-0000-0000-0000-000000000802', 'Data mapping confirmed', 'met', 'team', 4, '2026-08-21'),
  ('00000000-0000-0000-0000-000000000803', 'Manifest v2 signed', 'met', 'client', 1, '2026-08-29'),
  ('00000000-0000-0000-0000-000000000803', 'Integration design reviewed', 'met', 'team', 2, '2026-09-02'),
  ('00000000-0000-0000-0000-000000000803', 'Test data set agreed', 'met', 'team', 3, '2026-09-04'),
  ('00000000-0000-0000-0000-000000000803', 'Client access confirmed', 'open', 'client', 4, null),
  ('00000000-0000-0000-0000-000000000803', 'Client sign off on output format', 'open', 'client', 5, null);

insert into project_tasks (project_id, project_phase_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', 'NK-T001', 'Confirm Xero and Shopify API access', 'Client to create an API user in Xero with read and write on invoices, and a private app token in Shopify with read on orders. Credentials go into the shared vault, never into a task comment.', 'waiting_on_client', true, null, '2026-09-05', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', 'NK-T002', 'Kitchen sign off on prep sheet format', null, 'waiting_on_client', false, null, '2026-09-10', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', 'NK-T003', 'Order sync live in staging', null, 'in_progress', true, '2026-09-18', '2026-09-18', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', 'NK-T004', 'Prep sheet v1 in kitchen trial', null, 'idle', false, '2026-09-24', '2026-09-24', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000704', 'NK-T005', 'Release r4.1 adopted', null, 'idle', false, '2026-09-26', '2026-09-26', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000703', 'NK-T006', 'Shopify webhook design reviewed', null, 'done', false, null, '2026-08-20', '00000000-0000-0000-0000-000000000103');

insert into baselines (project_id, version, status, variance_days, approved_by, approved_at) values
  ('00000000-0000-0000-0000-000000000601', 'v1', 'superseded', 0, '00000000-0000-0000-0000-000000000102', '2026-08-19'),
  ('00000000-0000-0000-0000-000000000601', 'v2', 'approved', 11, '00000000-0000-0000-0000-000000000102', '2026-09-01');

insert into change_requests (project_id, ref, title, description, impact_dates_days, impact_effort, impact_price, status, raised_from_ref, created_by) values
  ('00000000-0000-0000-0000-000000000601', 'CR-011', 'Add multi-location prep sheet split', 'Kitchen wants prep sheets split per site, not one combined sheet.', 6, '2 days', 'Quoted', 'awaiting_signature', null, '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000601', 'CR-012', 'Retry queue for failed order sync', 'Pattern seen in hypercare on a similar integration; adding proactively.', 3, '1 day', 'Quoted', 'raised', null, '00000000-0000-0000-0000-000000000103');

insert into client_updates (project_id, title, body, status, author_person_id, published_at) values
  ('00000000-0000-0000-0000-000000000601', 'Held at G3, two access items outstanding',
   'Order sync is built and running against test data. We are held at gate G3 until two access items come back from your side: the Xero API user and the Shopify order token. Once both land we expect staging live within three working days.',
   'published', '00000000-0000-0000-0000-000000000102', '2026-09-02');

insert into documents (workspace_id, project_id, name, kind, version, visibility, requires_signature, signed_by, signed_at) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000601', 'Manifest v2', 'manifest', 'v2', 'client_visible', true, '00000000-0000-0000-0000-000000000102', '2026-08-29'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000601', 'Baseline v2 summary', 'baseline', 'v2', 'client_visible', false, null, null),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000601', 'Integration design notes', 'internal', 'v1', 'internal', false, null, null);

insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at) values
  ('00000000-0000-0000-0000-000000000601', 'provide_information', 'Xero and Shopify access', 'An API user in Xero and an order read token in Shopify. Step by step instructions sent 8 Sep.', 'pending', null, now() - interval '6 days', now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000000601', 'sign_artefact', 'Sign CR-011', 'Multi-location prep sheet split.', 'pending', null, now() + interval '5 days', now() - interval '1 day');

insert into client_signatures (project_id, document_id, status)
  select '00000000-0000-0000-0000-000000000601', id, 'completed' from documents
  where project_id = '00000000-0000-0000-0000-000000000601' and name = 'Manifest v2';

insert into client_view_configs (project_id) values ('00000000-0000-0000-0000-000000000601');
select fn_publish_client_view('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000102');

insert into share_links (id, project_id, token, status, expires_at, created_by, last_regenerated_at) values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000601', '7qx2m4', 'active', now() + interval '20 days', '00000000-0000-0000-0000-000000000102', '2026-09-01');

insert into share_link_views (share_link_id, viewed_at, ip_city, ip_country) values
  ('00000000-0000-0000-0000-000000000901', now() - interval '2 hours', 'Bangkok', 'Thailand'),
  ('00000000-0000-0000-0000-000000000901', '2026-09-01 09:02:00+00', 'Bangkok', 'Thailand');

-- A second, revoked link so the P·1 "revoked" state has something real to
-- point at (design source, screen "Error/expired states").
insert into share_links (project_id, token, status, revoked_at, created_by) values
  ('00000000-0000-0000-0000-000000000601', 'expired-demo-link', 'revoked', '2026-08-29', '00000000-0000-0000-0000-000000000102');

-- Project HF-M02: Freight quote intake --------------------------------------
insert into projects (id, workspace_id, client_id, ref, name, description, template_version_id, lead_person_id, go_live_target) values
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202',
   'HF-M02', 'Freight quote intake', 'Quote to booking with margin rules.',
   '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000101', '2026-12-01');

insert into project_phases (id, project_id, template_phase_id, index, code, name, started_at, completed_at) values
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000401', 0, '00', 'Intake', '2026-07-20', '2026-07-24'),
  ('00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000402', 1, '01', 'Discovery', '2026-07-24', '2026-08-02'),
  ('00000000-0000-0000-0000-000000000713', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000403', 2, '02', 'Design', '2026-08-02', null),
  ('00000000-0000-0000-0000-000000000714', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000404', 3, '03', 'Build', null, null),
  ('00000000-0000-0000-0000-000000000715', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000405', 4, '04', 'Test', null, null),
  ('00000000-0000-0000-0000-000000000716', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000406', 5, '05', 'Go live', null, null),
  ('00000000-0000-0000-0000-000000000717', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000407', 6, '06', 'Handover', null, null);

insert into project_gates (id, project_id, project_phase_id, template_gate_id, code, name, sequence, target_date) values
  ('00000000-0000-0000-0000-000000000811', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000501', 'G1', 'Discovery complete', 1, '2026-08-02'),
  ('00000000-0000-0000-0000-000000000812', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000713', '00000000-0000-0000-0000-000000000502', 'G2', 'Scope agreed', 2, '2026-09-22'),
  ('00000000-0000-0000-0000-000000000813', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000714', '00000000-0000-0000-0000-000000000503', 'G3', 'Foundation ready', 3, '2026-10-20'),
  ('00000000-0000-0000-0000-000000000814', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000715', '00000000-0000-0000-0000-000000000504', 'G4', 'Test complete', 4, '2026-11-10'),
  ('00000000-0000-0000-0000-000000000815', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000716', '00000000-0000-0000-0000-000000000505', 'G5', 'Go live', 5, '2026-12-01');

insert into project_gate_conditions (project_gate_id, description, status, owner, sequence, met_at) values
  ('00000000-0000-0000-0000-000000000811', 'Discovery workshop completed', 'met', 'team', 1, '2026-07-28'),
  ('00000000-0000-0000-0000-000000000811', 'Current-state process mapped', 'met', 'team', 2, '2026-07-30'),
  ('00000000-0000-0000-0000-000000000811', 'Success metrics agreed with client', 'met', 'client', 3, '2026-08-02'),
  ('00000000-0000-0000-0000-000000000812', 'Manifest v1 signed', 'met', 'client', 1, '2026-08-30'),
  ('00000000-0000-0000-0000-000000000812', 'Baseline v1 approved', 'open', 'client', 2, null),
  ('00000000-0000-0000-0000-000000000812', 'Integration design reviewed', 'met', 'team', 3, '2026-08-28'),
  ('00000000-0000-0000-0000-000000000812', 'Data mapping confirmed', 'met', 'team', 4, '2026-08-27');

insert into baselines (project_id, version, status, approved_by) values
  ('00000000-0000-0000-0000-000000000602', 'v1', 'draft', null);

insert into client_actions (project_id, kind, title, description, status, due_at, created_at) values
  ('00000000-0000-0000-0000-000000000602', 'sign_artefact', 'Sign baseline v1', 'Scope, dates and effort at approval.', 'pending', now() - interval '9 days', now() - interval '9 days');

insert into client_view_configs (project_id) values ('00000000-0000-0000-0000-000000000602');
select fn_publish_client_view('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000101');

-- Project BD-M01: Recall and rebook flow -------------------------------------
insert into projects (id, workspace_id, client_id, ref, name, description, template_version_id, lead_person_id, go_live_target) values
  ('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203',
   'BD-M01', 'Recall and rebook flow', 'Patient recall to booked appointment.',
   '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000103', '2026-10-15');

insert into project_phases (id, project_id, template_phase_id, index, code, name, started_at, completed_at) values
  ('00000000-0000-0000-0000-000000000721', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000401', 0, '00', 'Intake', '2026-06-25', '2026-06-28'),
  ('00000000-0000-0000-0000-000000000722', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000402', 1, '01', 'Discovery', '2026-06-28', '2026-07-06'),
  ('00000000-0000-0000-0000-000000000723', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000403', 2, '02', 'Design', '2026-07-06', '2026-07-20'),
  ('00000000-0000-0000-0000-000000000724', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000404', 3, '03', 'Build', '2026-07-20', '2026-08-25'),
  ('00000000-0000-0000-0000-000000000725', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000405', 4, '04', 'Test', '2026-08-25', null),
  ('00000000-0000-0000-0000-000000000726', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000406', 5, '05', 'Go live', null, null),
  ('00000000-0000-0000-0000-000000000727', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000407', 6, '06', 'Handover', null, null);

insert into project_gates (id, project_id, project_phase_id, template_gate_id, code, name, sequence, target_date) values
  ('00000000-0000-0000-0000-000000000821', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000722', '00000000-0000-0000-0000-000000000501', 'G1', 'Discovery complete', 1, '2026-07-06'),
  ('00000000-0000-0000-0000-000000000822', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000723', '00000000-0000-0000-0000-000000000502', 'G2', 'Scope agreed', 2, '2026-07-20'),
  ('00000000-0000-0000-0000-000000000823', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000724', '00000000-0000-0000-0000-000000000503', 'G3', 'Foundation ready', 3, '2026-08-25'),
  ('00000000-0000-0000-0000-000000000824', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000725', '00000000-0000-0000-0000-000000000504', 'G4', 'Test complete', 4, '2026-09-30'),
  ('00000000-0000-0000-0000-000000000825', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000726', '00000000-0000-0000-0000-000000000505', 'G5', 'Go live', 5, '2026-10-15');

insert into project_gate_conditions (project_gate_id, description, status, owner, sequence, met_at) values
  ('00000000-0000-0000-0000-000000000821', 'Discovery workshop completed', 'met', 'team', 1, '2026-07-02'),
  ('00000000-0000-0000-0000-000000000822', 'Manifest v1 signed', 'met', 'client', 1, '2026-07-18'),
  ('00000000-0000-0000-0000-000000000823', 'Manifest v2 signed', 'met', 'client', 1, '2026-08-20'),
  ('00000000-0000-0000-0000-000000000824', 'UAT completed', 'met', 'team', 1, '2026-09-01'),
  ('00000000-0000-0000-0000-000000000824', 'Defect backlog cleared', 'met', 'team', 2, '2026-09-02'),
  ('00000000-0000-0000-0000-000000000824', 'Performance test passed', 'met', 'team', 3, '2026-09-02'),
  ('00000000-0000-0000-0000-000000000824', 'Client review booked', 'met', 'client', 4, '2026-09-02');

insert into client_view_configs (project_id) values ('00000000-0000-0000-0000-000000000603');
select fn_publish_client_view('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000103');

-- Project RO-M03: Stock sync and reorder -------------------------------------
insert into projects (id, workspace_id, client_id, ref, name, description, template_version_id, lead_person_id, go_live_target) values
  ('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204',
   'RO-M03', 'Stock sync and reorder', 'Supplier stock into reorder proposals.',
   '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '2026-09-01');

insert into project_phases (id, project_id, template_phase_id, index, code, name, started_at, completed_at) values
  ('00000000-0000-0000-0000-000000000731', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000401', 0, '00', 'Intake', '2026-04-01', '2026-04-05'),
  ('00000000-0000-0000-0000-000000000732', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000402', 1, '01', 'Discovery', '2026-04-05', '2026-04-15'),
  ('00000000-0000-0000-0000-000000000733', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000403', 2, '02', 'Design', '2026-04-15', '2026-05-01'),
  ('00000000-0000-0000-0000-000000000734', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000404', 3, '03', 'Build', '2026-05-01', '2026-07-01'),
  ('00000000-0000-0000-0000-000000000735', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000405', 4, '04', 'Test', '2026-07-01', '2026-08-15'),
  ('00000000-0000-0000-0000-000000000736', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000406', 5, '05', 'Go live', '2026-08-15', '2026-09-01'),
  ('00000000-0000-0000-0000-000000000737', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000407', 6, '06', 'Handover', '2026-09-01', null);

insert into project_gates (id, project_id, project_phase_id, template_gate_id, code, name, sequence, target_date, cleared_at) values
  ('00000000-0000-0000-0000-000000000831', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000732', '00000000-0000-0000-0000-000000000501', 'G1', 'Discovery complete', 1, '2026-04-15', '2026-04-14'),
  ('00000000-0000-0000-0000-000000000832', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000733', '00000000-0000-0000-0000-000000000502', 'G2', 'Scope agreed', 2, '2026-05-01', '2026-04-30'),
  ('00000000-0000-0000-0000-000000000833', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000734', '00000000-0000-0000-0000-000000000503', 'G3', 'Foundation ready', 3, '2026-07-01', '2026-06-28'),
  ('00000000-0000-0000-0000-000000000834', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000735', '00000000-0000-0000-0000-000000000504', 'G4', 'Test complete', 4, '2026-08-15', '2026-08-12'),
  ('00000000-0000-0000-0000-000000000835', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000736', '00000000-0000-0000-0000-000000000505', 'G5', 'Go live', 5, '2026-09-01', '2026-09-01');

insert into project_gate_conditions (project_gate_id, description, status, owner, sequence, met_at)
  select id, 'All conditions met', 'met', 'team', 1, cleared_at from project_gates where project_id = '00000000-0000-0000-0000-000000000604';

insert into client_view_configs (project_id) values ('00000000-0000-0000-0000-000000000604');
select fn_publish_client_view('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000102');

-- Product space: Manifest engine ---------------------------------------------
insert into products (id, workspace_id, name, description) values
  ('00000000-0000-0000-0000-000000000A01', '00000000-0000-0000-0000-000000000001', 'Manifest engine', 'The shared flight-plan and agent-register accelerator every delivery project builds on.'),
  ('00000000-0000-0000-0000-000000000A02', '00000000-0000-0000-0000-000000000001', 'Client portal kit', 'Reusable client-facing components: share links, portal shell, published projections.');

insert into releases (id, product_id, code, name, target_date, readiness_pct, status) values
  ('00000000-0000-0000-0000-000000000A11', '00000000-0000-0000-0000-000000000A01', 'r4.1', 'Agent register versioning and retry queue', '2026-09-24', 71, 'in_progress'),
  ('00000000-0000-0000-0000-000000000A12', '00000000-0000-0000-0000-000000000A02', 'r1.3', 'Public share link revocation UI', '2026-09-12', 90, 'ready');

insert into roadmap_items (product_id, ref, title, description, kind, status, quarter, release_id, owner_person_id) values
  ('00000000-0000-0000-0000-000000000A01', 'FT-108', 'Agent register versioning',
   'Agents currently resolve to the latest definition, so a client running an older manifest gets behaviour they never signed off. Versioning pins each project to the definition its manifest names.',
   'feature', 'in_progress', null, '00000000-0000-0000-0000-000000000A11', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000A01', 'FT-112', 'Retry queue with backoff',
   'Failed integration pushes currently need a manual retry. A backoff queue turns a transient failure into an automatic retry instead of a hypercare incident.',
   'feature', 'in_progress', null, '00000000-0000-0000-0000-000000000A11', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000A01', 'FT-120', 'Multi-tenant manifest storage', null, 'epic', 'forecast', 'Q4 2026', null, '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000A02', 'FT-201', 'Share link revocation UI', null, 'feature', 'committed', null, '00000000-0000-0000-0000-000000000A12', '00000000-0000-0000-0000-000000000105');

insert into project_release_dependencies (project_id, release_id, note) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000A11', 'Order sync retries depend on r4.1 retry queue.'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000A11', 'Freight quote versioning depends on agent register.');

insert into release_criteria (release_id, description, status, met_at, sequence) values
  ('00000000-0000-0000-0000-000000000A11', 'Regression suite green on staging', 'met', '2026-09-11', 1),
  ('00000000-0000-0000-0000-000000000A11', 'Migration rehearsed on a copy of production', 'met', '2026-09-12', 2),
  ('00000000-0000-0000-0000-000000000A11', 'Release note drafted', 'met', '2026-09-12', 3),
  ('00000000-0000-0000-0000-000000000A11', 'Rollback path signed by an engineer who did not build it', 'open', null, 4),
  ('00000000-0000-0000-0000-000000000A11', 'Delivery impact reviewed with each affected lead', 'open', null, 5),
  ('00000000-0000-0000-0000-000000000A12', 'Regression suite green on staging', 'met', '2026-09-05', 1),
  ('00000000-0000-0000-0000-000000000A12', 'Delivery impact reviewed with each affected lead', 'met', '2026-09-06', 2);

insert into engineering_tasks (workspace_id, person_id, ref, title, roadmap_item_id, release_id, status)
  select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000105', 'ENG-041', 'Version column on agent register',
    (select id from roadmap_items where ref = 'FT-108'), '00000000-0000-0000-0000-000000000A11', 'in_progress';

-- Hypercare space -------------------------------------------------------------
insert into services (id, workspace_id, client_id, origin_project_id, ref, name, live_since) values
  ('00000000-0000-0000-0000-000000000B01', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000604', 'SVC-01', 'Ridgeline stock sync', '2026-09-01'),
  ('00000000-0000-0000-0000-000000000B02', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', null, 'SVC-02', 'Halcyon billing relay', '2026-06-02'),
  ('00000000-0000-0000-0000-000000000B03', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', null, 'SVC-03', 'Beacon recall notifier', '2026-05-14'),
  ('00000000-0000-0000-0000-000000000B04', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', null, 'SVC-04', 'Halcyon rate lookup', '2026-04-20'),
  ('00000000-0000-0000-0000-000000000B05', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', null, 'SVC-05', 'Beacon booking sync', '2026-03-30'),
  ('00000000-0000-0000-0000-000000000B06', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204', null, 'SVC-06', 'Ridgeline reorder proposals', '2026-02-18');

insert into sla_policies (service_id, name, response_target_minutes, resolve_target_minutes, business_hours_only) values
  ('00000000-0000-0000-0000-000000000B01', 'Standard', 60, 480, true),
  ('00000000-0000-0000-0000-000000000B02', 'Standard', 60, 480, true),
  ('00000000-0000-0000-0000-000000000B03', 'Standard', 60, 480, true),
  ('00000000-0000-0000-0000-000000000B04', 'Standard', 60, 480, true),
  ('00000000-0000-0000-0000-000000000B05', 'Standard', 60, 480, true),
  ('00000000-0000-0000-0000-000000000B06', 'Standard', 60, 480, true);

insert into incidents (id, service_id, ref, title, severity, status, opened_at, breach_at, root_cause, created_by) values
  ('00000000-0000-0000-0000-000000000C01', '00000000-0000-0000-0000-000000000B02', 'INC-114', 'Invoice sync failing', 'sev1', 'investigating', now() - interval '20 hours', now() + interval '4 hours', 'Xero refresh token expired, no rotation job. Fix is a token refresh agent.', '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000C02', '00000000-0000-0000-0000-000000000B04', 'INC-098', 'Rate lookup timing out intermittently', 'sev2', 'open', now() - interval '3 days', now() + interval '1 day', null, '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000C03', '00000000-0000-0000-0000-000000000B05', 'INC-101', 'Booking sync duplicate rows', 'sev3', 'open', now() - interval '2 days', null, null, '00000000-0000-0000-0000-000000000104');

insert into support_requests (service_id, ref, title, status) values
  ('00000000-0000-0000-0000-000000000B03', 'REQ-055', 'Add a second recall reminder channel', 'in_progress'),
  ('00000000-0000-0000-0000-000000000B06', 'REQ-061', 'Change reorder threshold for winter SKUs', 'open');

insert into change_requests (project_id, ref, title, description, status, raised_from_ref, created_by) values
  ('00000000-0000-0000-0000-000000000602', 'CR-014', 'Token refresh agent', 'A token refresh agent is not in the current manifest. Raised so it is priced and baselined; pattern also flagged for the product roadmap.', 'raised', 'INC-114', '00000000-0000-0000-0000-000000000104');

insert into escalations (workspace_id, service_id, incident_id, reason, escalated_to_person_id, status) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000B02', '00000000-0000-0000-0000-000000000C01', 'Sev1 breach risk inside 4 hours', '00000000-0000-0000-0000-000000000102', 'open');

insert into cross_space_links (workspace_id, from_type, from_id, to_type, to_id, relationship, created_by) values
  ('00000000-0000-0000-0000-000000000001', 'incident', '00000000-0000-0000-0000-000000000C01', 'change_request', (select id from change_requests where ref = 'CR-014'), 'hypercare_to_delivery_change_request', '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000001', 'project', '00000000-0000-0000-0000-000000000604', 'service', '00000000-0000-0000-0000-000000000B01', 'go_live_handover', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000001', 'release', '00000000-0000-0000-0000-000000000A11', 'project', '00000000-0000-0000-0000-000000000601', 'release_dependency', '00000000-0000-0000-0000-000000000105');

-- Notifications ---------------------------------------------------------------
insert into notifications (workspace_id, person_id, kind, title, body, related_url, is_read) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'gate_held', 'G3 held on NK-M01', 'Two conditions open, both waiting on the client.', '/delivery/projects/nk-m01', false),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'incident', 'INC-114 breaches SLA in 4 hours', 'Invoice sync failing on Halcyon billing relay.', '/hypercare/incidents/inc-114', false),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'change_request', 'CR-011 awaiting client signature', 'Multi-location prep sheet split.', '/delivery/projects/nk-m01', false),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'release', 'Release r4.1 at 71% readiness', 'Two delivery projects wait on this release.', '/product/releases/r4-1', true);

commit;
