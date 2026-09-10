-- Real data for the first live client, Nutrition Kitchen, plus the
-- aironauts(tm) Flight Plan as the master delivery template.
--
-- Source documents: aironauts flight plan v0.6 (27 Aug 2026), the
-- Nutrition Kitchen Phase 1 kickoff deck (25 Aug 2026), the actual signed
-- MSA and SOW-2026-001 (both countersigned 22-23 Aug 2026, kickoff Monday
-- 24 Aug 2026 per SOW section 5's own timeline), and -- as of the update
-- below -- the NK Core fortnightly checkpoint dated 8 September 2026
-- (status as at Monday 7 September 2026, week 3 of 10).
--
-- UPDATED to the 8 September checkpoint: five migrations on production
-- since 4 September, schema sign-off landed a week early (so phase 03 is
-- now complete rather than in progress), order ingestion is now the
-- active work (phase 04, in progress), and BOM explosion/nested
-- costing/PO drafting is queued next. Tony's answers to kickoff questions
-- 9-15 came back, closing that item, but a new one opened in its place:
-- continuity cover on the schema (a second name alongside Tony) is still
-- unnamed and is now the nearest open item. See the phases, gates, and
-- tasks sections below for exactly what changed against the 25 Aug
-- kickoff snapshot.
--
-- CORRECTED against the signed contracts (superseded by the 8 Sep update
-- above for phase/task status, but the correction itself still holds):
-- an earlier version of this file dated phases 00-03 entirely in
-- June-August 2026 and G2's "agreement signed" condition on 2026-07-10 --
-- more than a month before the MSA/SOW were actually signed (22-23 Aug
-- 2026). Phases 00-02 have no individually documented dates anywhere (the
-- SOW's own section 9.1 records the pre-contract reverse-engineering work
-- as "deemed performed under this SOW" without giving it a date), so they
-- are dated only as complete on the real signature date -- not spread
-- across invented earlier dates.
--
-- RECONCILED against the fully executed contract set (MSA v2, SOW-2026-001
-- v2, SOW-2026-002 v2 -- all Docusign-signed, SOW-001 by both parties
-- 22-23 Aug 2026): the project name is now the exact SOW-2026-001 clause
-- 9.6 Engagement Title ("this engagement is referred to as [this name] in
-- all invoices, claims and correspondence relating to it"), replacing a
-- shorter non-contractual name. Recurly is added everywhere Shopify was
-- named alone -- SOW-2026-001 sections 1/2 put both order sources in
-- scope ("orders ingest from Shopify and Recurly"), which this file had
-- missed entirely. T05/T06/T08/T09 due dates are corrected to the exact
-- week-ending dates in SOW-2026-001 section 5's timeline table (the
-- authoritative source; this file's dates had drifted a day off it in
-- several places). New: T16 tracks the section-4 acceptance-criteria
-- caveat that cutover moves with the Client's Singapore audit date, not
-- unconditionally on 16 October. L.T. Low's placeholder email is replaced
-- with the real address confirmed by the SOW's own Invoice To / Client
-- Project Lead fields. SOW-2026-002 (Hypercare, not yet effective --
-- its Effective Date is Singapore Go-Live acceptance under SOW-001) is
-- not yet seeded as data: its P1/P2/P3 support targets (section 6) need
-- an sla_policies row scoped to a services row for this client, and no
-- services row can exist until go-live under this app's current design
-- (services are created only by hand today, see the Hypercare audit
-- notes elsewhere) -- flagged here so it isn't forgotten before go-live,
-- not fabricated ahead of it.
--
-- SAFE TO RUN AGAINST A LIVE DATABASE, AND SAFE TO RE-RUN: every insert
-- either uses a real unique constraint (ON CONFLICT ... DO UPDATE) or an
-- explicit find-or-create check, so running this twice updates the same
-- rows instead of duplicating them. It does not assume supabase/seed.sql
-- (the fictional demo portfolio) has been run first or at all. Run
-- supabase/reset_and_reseed_nk_live.sql first if you want a clean slate
-- (it also removes the fictional demo client) before running this file.
--
-- Placeholder emails: the source deck names Nutrition Kitchen's people
-- (L.T. Low, Tony, Shirley). L.T. Low's real address is now confirmed by
-- the signed SOW-2026-001/002 (ltlow@nutritionkitchensg.com) and used
-- below. Tony and Shirley still have no documented address anywhere, so
-- they keep obviously-fake @nutritionkitchen.example addresses (.example
-- is reserved for documentation, RFC 2606) -- replace them with real
-- addresses before actually inviting those two people to sign in.

begin;

do $$
declare
  v_workspace_id uuid;

  v_nittaya_id uuid;
  v_orhan_id uuid;
  v_manh_id uuid;
  v_jun_id uuid;
  v_chris_id uuid;

  v_lt_id uuid;
  v_tony_id uuid;
  v_shirley_id uuid;

  v_client_id uuid;

  v_template_id uuid;
  v_version_id uuid;

  v_phase00_id uuid; v_phase01_id uuid; v_phase02_id uuid; v_phase03_id uuid;
  v_phase04_id uuid; v_phase05_id uuid; v_phase06_id uuid;

  v_gate1_id uuid; v_gate2_id uuid; v_gate3_id uuid; v_gate4_id uuid; v_gate5_id uuid;

  v_project_id uuid;

  v_pp00_id uuid; v_pp01_id uuid; v_pp02_id uuid; v_pp03_id uuid;
  v_pp04_id uuid; v_pp05_id uuid; v_pp06_id uuid;

  v_pg1_id uuid; v_pg2_id uuid; v_pg3_id uuid; v_pg4_id uuid; v_pg5_id uuid;
begin

  -- 1. Workspace ------------------------------------------------------------
  select id into v_workspace_id from workspaces order by created_at asc limit 1;
  if v_workspace_id is null then
    insert into workspaces (name, slug) values ('greydigi', 'greydigi') returning id into v_workspace_id;
  end if;

  -- 2. greydigi people, from the kickoff deck's counterpart list ------------
  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Nittaya', 'nittaya@greydigi.com', 'internal', 'NI', 'workspace_admin')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_nittaya_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Orhan Yilmaz', 'orhan@greydigi.com', 'internal', 'OY', 'delivery_lead')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name, workspace_role = excluded.workspace_role
  returning id into v_orhan_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Manh', 'manh@greydigi.com', 'internal', 'MA', 'member')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_manh_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Jun Kith Ng', 'jun@greydigi.com', 'internal', 'JN', 'member')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_jun_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Chris Schuler', 'chris@greydigi.com', 'internal', 'CS', 'member')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_chris_id;

  -- 3. Nutrition Kitchen client + client-side contacts -----------------------
  select id into v_client_id from clients where workspace_id = v_workspace_id and name = 'Nutrition Kitchen';
  if v_client_id is null then
    insert into clients (workspace_id, name, client_since)
    values (v_workspace_id, 'Nutrition Kitchen', '2026-08-14')
    returning id into v_client_id;
  end if;

  -- Real address confirmed by the signed SOW-2026-001/002 (Client Project
  -- Lead / Invoice To / Client Service Contact fields) -- rename the old
  -- placeholder in place first so the on-conflict insert below updates the
  -- same person row (and keeps every existing client_roles/task/action
  -- reference intact) instead of inserting a second "L.T. Low".
  update people set email = 'ltlow@nutritionkitchensg.com'
  where workspace_id = v_workspace_id and email = 'lt.low@nutritionkitchen.example';

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'L.T. Low', 'ltlow@nutritionkitchensg.com', 'client', 'LL', 'client')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_lt_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Tony', 'tony@nutritionkitchen.example', 'client', 'TO', 'client')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_tony_id;

  insert into people (workspace_id, full_name, email, kind, avatar_initials, workspace_role)
  values (v_workspace_id, 'Shirley', 'shirley@nutritionkitchen.example', 'client', 'SH', 'client')
  on conflict (workspace_id, email) do update set full_name = excluded.full_name
  returning id into v_shirley_id;

  insert into client_roles (person_id, client_id, role) values
    (v_lt_id, v_client_id, 'project_lead'),
    (v_tony_id, v_client_id, 'schema_owner'),
    (v_shirley_id, v_client_id, 'client_contact')
  on conflict (person_id, client_id) do update set role = excluded.role;

  -- 4. Template: aironauts(tm) Flight Plan, v0.6 -----------------------------
  -- Seven phases, five gates, six signed artefacts (flight plan pages 3-4).
  select id into v_template_id from templates where workspace_id = v_workspace_id and name = 'aironauts (tm) Flight Plan';
  if v_template_id is null then
    insert into templates (workspace_id, name)
    values (v_workspace_id, 'aironauts (tm) Flight Plan')
    returning id into v_template_id;
  end if;

  insert into template_versions (template_id, version, is_locked, locked_at)
  values (v_template_id, 'v0.6', true, '2026-08-27')
  on conflict (template_id, version) do update set is_locked = excluded.is_locked
  returning id into v_version_id;

  insert into template_phases (template_version_id, index, code, name) values
    (v_version_id, 0, '00', 'Readiness check'),
    (v_version_id, 1, '01', 'Mission brief'),
    (v_version_id, 2, '02', 'Scope sprint'),
    (v_version_id, 3, '03', 'Manifest and foundation'),
    (v_version_id, 4, '04', 'Deploy sprint'),
    (v_version_id, 5, '05', 'Measure'),
    (v_version_id, 6, '06', 'Operate and expand')
  on conflict (template_version_id, index) do update set code = excluded.code, name = excluded.name;

  select id into v_phase00_id from template_phases where template_version_id = v_version_id and index = 0;
  select id into v_phase01_id from template_phases where template_version_id = v_version_id and index = 1;
  select id into v_phase02_id from template_phases where template_version_id = v_version_id and index = 2;
  select id into v_phase03_id from template_phases where template_version_id = v_version_id and index = 3;
  select id into v_phase04_id from template_phases where template_version_id = v_version_id and index = 4;
  select id into v_phase05_id from template_phases where template_version_id = v_version_id and index = 5;
  select id into v_phase06_id from template_phases where template_version_id = v_version_id and index = 6;

  insert into template_gates (template_version_id, template_phase_id, code, name, sequence) values
    (v_version_id, v_phase01_id, 'G1', 'Cleared to scope', 1),
    (v_version_id, v_phase02_id, 'G2', 'Cleared to build', 2),
    (v_version_id, v_phase03_id, 'G3', 'No foundation, no Fleet', 3),
    (v_version_id, v_phase04_id, 'G4', 'Cleared to fly', 4),
    (v_version_id, v_phase05_id, 'G5', 'Value confirmed', 5)
  on conflict (template_version_id, code) do update set name = excluded.name, template_phase_id = excluded.template_phase_id;

  select id into v_gate1_id from template_gates where template_version_id = v_version_id and code = 'G1';
  select id into v_gate2_id from template_gates where template_version_id = v_version_id and code = 'G2';
  select id into v_gate3_id from template_gates where template_version_id = v_version_id and code = 'G3';
  select id into v_gate4_id from template_gates where template_version_id = v_version_id and code = 'G4';
  select id into v_gate5_id from template_gates where template_version_id = v_version_id and code = 'G5';

  delete from template_gate_conditions where template_gate_id in (v_gate1_id, v_gate2_id, v_gate3_id, v_gate4_id, v_gate5_id);
  insert into template_gate_conditions (template_gate_id, description, requires_signature, sequence) values
    (v_gate1_id, 'Mission brief validated in the review call', false, 1),
    (v_gate1_id, 'Indicative pricing given and accepted', false, 2),
    (v_gate1_id, 'NDA signed', true, 3),
    (v_gate2_id, 'Scope brief signed, carrying baseline and anticipated outcome', true, 1),
    (v_gate2_id, 'Quote signed', true, 2),
    (v_gate2_id, 'Agreement signed, with change-control terms', true, 3),
    (v_gate3_id, 'Manifest v1 and foundation schema delivered, client-owned and portable', true, 1),
    (v_gate3_id, 'Connector coverage met, source of truth live', false, 2),
    (v_gate4_id, 'Go-live pack delivered: eval results, agent register, audit check, rollback plan', true, 1),
    (v_gate4_id, 'Human in the loop verified end to end on live data', false, 2),
    (v_gate5_id, 'Tie-out certificate signed, countersigned by client finance', true, 1),
    (v_gate5_id, 'Recommendation to scale, adjust or stop delivered', false, 2);

  insert into template_tasks (template_version_id, template_phase_id, title, is_critical_path) values
    (v_version_id, v_phase02_id, 'Baseline current state and anticipated outcome', true),
    (v_version_id, v_phase02_id, 'Action map, autonomy graded per action', true),
    (v_version_id, v_phase03_id, 'Stand up the foundation, one source of truth for work state', true),
    (v_version_id, v_phase04_id, 'Build and evaluate agents, human review wired in', true),
    (v_version_id, v_phase04_id, 'Operator training and runbook', false),
    (v_version_id, v_phase05_id, 'Tie-out: baseline against outcome on agreed metrics', true),
    (v_version_id, v_phase06_id, 'Monthly operations report', false),
    (v_version_id, v_phase06_id, 'Quarterly review: drift, re-run evaluation, re-baseline', false)
  on conflict do nothing;

  -- 5. Project: NK Core, Phase 1 (signed SOW-2026-001) -----------------------
  -- Name is the exact Engagement Title from SOW-2026-001 clause 9.6 ("this
  -- engagement is referred to as [this name] in all invoices, claims and
  -- correspondence relating to it") -- previously a shorter, non-contractual
  -- name ("Order to procurement automation"). Description corrected to name
  -- BOTH order sources per SOW section 1/2: Shopify AND Recurly -- the
  -- earlier version of this file only mentioned Shopify, missing a source
  -- the signed contract explicitly puts in scope.
  insert into projects (workspace_id, client_id, ref, name, description, template_version_id, lead_person_id, go_live_target)
  values (
    v_workspace_id, v_client_id, 'NK-P1', 'NK Core, Phase 1: order to kitchen automation, Singapore',
    'Order receipt to approved PO drafts, taken out of hand. Managed database on Tony''s schema, Shopify and Recurly API ingestion as the two order sources, automated BOM explosion and nested costing, PO drafts and kitchen documents, an approval gate, and the aironauts dashboard with multi-user access.',
    v_version_id, v_orhan_id, '2026-10-16'
  )
  on conflict (workspace_id, ref) do update set
    name = excluded.name, description = excluded.description,
    template_version_id = excluded.template_version_id,
    lead_person_id = excluded.lead_person_id, go_live_target = excluded.go_live_target
  returning id into v_project_id;

  -- 6. Project phases. 00-02 (readiness check, mission brief, scope sprint)
  -- happened before the Effective Date but have no individually documented
  -- dates anywhere -- SOW 9.1 records the pre-contract work as "deemed
  -- performed under this SOW", undated -- so they are dated complete only
  -- on the real signature date, with no invented start date. 03 (Manifest
  -- and foundation) is now complete as of the 8 Sep checkpoint -- "schema
  -- sign-off landed a week early, so nothing right of it has moved" --
  -- dated to 4 September, the day the checkpoint says the database and
  -- migrations went live on production. 04 (Deploy sprint) is now the
  -- active phase, started the same day (order ingestion mapping is the
  -- checkpoint's current work). 05-06 have not started.
  insert into project_phases (project_id, template_phase_id, index, code, name, started_at, completed_at) values
    (v_project_id, v_phase00_id, 0, '00', 'Readiness check', null, '2026-08-23'),
    (v_project_id, v_phase01_id, 1, '01', 'Mission brief', null, '2026-08-23'),
    (v_project_id, v_phase02_id, 2, '02', 'Scope sprint', null, '2026-08-23'),
    (v_project_id, v_phase03_id, 3, '03', 'Manifest and foundation', '2026-08-24', '2026-09-04'),
    (v_project_id, v_phase04_id, 4, '04', 'Deploy sprint', '2026-09-04', null),
    (v_project_id, v_phase05_id, 5, '05', 'Measure', null, null),
    (v_project_id, v_phase06_id, 6, '06', 'Operate and expand', null, null)
  on conflict (project_id, index) do update set
    code = excluded.code, name = excluded.name, started_at = excluded.started_at, completed_at = excluded.completed_at;

  select id into v_pp00_id from project_phases where project_id = v_project_id and index = 0;
  select id into v_pp01_id from project_phases where project_id = v_project_id and index = 1;
  select id into v_pp02_id from project_phases where project_id = v_project_id and index = 2;
  select id into v_pp03_id from project_phases where project_id = v_project_id and index = 3;
  select id into v_pp04_id from project_phases where project_id = v_project_id and index = 4;
  select id into v_pp05_id from project_phases where project_id = v_project_id and index = 5;
  select id into v_pp06_id from project_phases where project_id = v_project_id and index = 6;

  -- 7. Project gates. G1 and G2 cleared together on the real signature date
  -- (both the NDA-stage and the agreement-stage conditions bundle into one
  -- signed date for this engagement -- no separate NDA date is documented).
  -- G3's target was Milestone 02 "Mid-build" (SOW section 7, w/c 14 Sep),
  -- but per the 8 Sep checkpoint the foundation actually landed early --
  -- both conditions below are now 'met', so the trigger-derived status
  -- (fn_recompute_project_gates, 0006_state_engine.sql) resolves G3 to
  -- 'cleared' and moves the bottleneck to G4, whose two conditions are
  -- still open (the go-live pack and human-in-the-loop verification are
  -- deploy-sprint work, not yet done) -- matching the checkpoint's own
  -- framing of one gate cleared, M02 opening in week 4. G4 targets cutover
  -- (16 Oct), G5 ten days after.
  insert into project_gates (project_id, project_phase_id, template_gate_id, code, name, sequence, target_date) values
    (v_project_id, v_pp01_id, v_gate1_id, 'G1', 'Cleared to scope', 1, '2026-08-23'),
    (v_project_id, v_pp02_id, v_gate2_id, 'G2', 'Cleared to build', 2, '2026-08-23'),
    (v_project_id, v_pp03_id, v_gate3_id, 'G3', 'No foundation, no Fleet', 3, '2026-09-14'),
    (v_project_id, v_pp04_id, v_gate4_id, 'G4', 'Cleared to fly', 4, '2026-10-16'),
    (v_project_id, v_pp05_id, v_gate5_id, 'G5', 'Value confirmed', 5, '2026-10-30')
  on conflict (project_id, code) do update set
    project_phase_id = excluded.project_phase_id, template_gate_id = excluded.template_gate_id,
    name = excluded.name, target_date = excluded.target_date;

  select id into v_pg1_id from project_gates where project_id = v_project_id and code = 'G1';
  select id into v_pg2_id from project_gates where project_id = v_project_id and code = 'G2';
  select id into v_pg3_id from project_gates where project_id = v_project_id and code = 'G3';
  select id into v_pg4_id from project_gates where project_id = v_project_id and code = 'G4';
  select id into v_pg5_id from project_gates where project_id = v_project_id and code = 'G5';

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

  -- 8. Tasks: the W1-W10 roadmap plus the kickoff session's own action list.
  -- Updated to the 8 Sep checkpoint (week 3 of 10) AND reconciled against
  -- the signed SOW-2026-001 section 5 timeline table, which is the
  -- authoritative source for due dates -- T05/T06/T08/T09 below were off
  -- by a day against the contract's actual week boundaries; corrected to
  -- match section 5 exactly (W3 ends 13 Sep, W4 ends 20 Sep, W5 ends 27
  -- Sep, W6 ends 4 Oct). T03 mobilise and T04 schema sign-off are both
  -- done -- Tony's answers to questions 9-15 came back, closing that item
  -- -- T05 order ingestion is now in progress, and T06 BOM explosion is
  -- queued next (unchanged, still not started). T05 and T03 also now name
  -- Recurly alongside Shopify -- the SOW's own engagement objectives and
  -- success criteria (section 1) name both as order sources, which this
  -- file previously missed entirely. T11 gets a note on the still-open
  -- deputy-signer question, and on the SOW's own acceptance-criteria
  -- caveat that cutover moves with the Client's Singapore audit date
  -- (SOW section 4) -- tracked as its own dependency in T16 below.
  insert into project_tasks (project_id, project_phase_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id) values
    (v_project_id, v_pp04_id, 'NK-P1-T01', 'Counterparts and deputies named, both sides', null, 'done', false, null, '2026-08-25', v_orhan_id),
    (v_project_id, v_pp04_id, 'NK-P1-T02', 'Scope boundary accepted, in scope against out of scope', null, 'done', false, null, '2026-08-25', v_orhan_id),
    (v_project_id, v_pp04_id, 'NK-P1-T03', 'Mobilise: environments provisioned, day-one access issued', 'Shopify and Recurly API credentials, Xero connection, FMP read access, environments, supplier master, data processing agreement.', 'done', true, null, '2026-08-30', v_jun_id),
    (v_project_id, v_pp04_id, 'NK-P1-T04', 'Managed database and schema sign-off with Tony', 'Live on production since 4 September. Tony''s answers to kickoff questions 9-15 are in, unblocking product mapping -- continuity cover on the schema is tracked separately as NK-P1-T13.', 'done', true, null, '2026-09-06', v_jun_id),
    (v_project_id, v_pp04_id, 'NK-P1-T05', 'Shopify and Recurly order ingestion: landing then mapping', 'Landing live; mapping into the kitchen''s master rows (package, day, slot, delivery zone) is under way. No manual export step from either source, per SOW-2026-001 success criteria.', 'in_progress', true, null, '2026-09-13', v_manh_id),
    (v_project_id, v_pp04_id, 'NK-P1-T06', 'BOM explosion, nested costing, PO drafting', 'Purchase orders, demand counts, and production runs, seeded from the Procurement and Production Planning workbooks. Queued next once T05 closes.', 'idle', true, null, '2026-09-20', v_manh_id),
    (v_project_id, v_pp04_id, 'NK-P1-T07', 'Xero write-back and supplier records', null, 'idle', false, null, '2026-09-27', v_manh_id),
    (v_project_id, v_pp04_id, 'NK-P1-T08', 'Approval gate, aironauts dashboard, multi-user access', 'Named approvers for the approval gate confirmed by NK, W4 to W5. Supplier fallback handling active per SOW-2026-001 section 2.', 'idle', false, null, '2026-09-27', v_jun_id),
    (v_project_id, v_pp04_id, 'NK-P1-T09', 'PO dispatch and kitchen documents', 'The eleven documents: POs, receiving card, production sheet, recipe book, packing sheet, defrost plan, consumer labels, Xero bill batch, weekly Excel backup, spend/price/consumption exports.', 'idle', false, null, '2026-10-04', v_jun_id),
    (v_project_id, v_pp04_id, 'NK-P1-T10', 'Parallel run, W7-W8: line by line reconciliation', 'Excel stays the system of record until both parallel weeks reconcile line by line. Needs real kitchen and procurement time on both weeks -- see NK-P1-T15.', 'idle', true, '2026-10-11', '2026-10-11', v_orhan_id),
    (v_project_id, v_pp04_id, 'NK-P1-T11', 'Cutover and first live release', 'M03. Named acceptance of cutover closes on a signature -- who signs, and L.T.''s deputy for that signature, is still open (due W5). Per SOW-2026-001 section 4, cutover moves to the first Friday clear of the Client''s Singapore audit once those dates are confirmed -- see NK-P1-T16.', 'idle', true, '2026-10-16', '2026-10-16', v_orhan_id),
    (v_project_id, v_pp05_id, 'NK-P1-T12', 'Stabilisation, hypercare, handover pack', null, 'idle', false, null, '2026-10-26', v_nittaya_id),
    (v_project_id, v_pp04_id, 'NK-P1-T13', 'Continuity cover on the schema', 'A second name alongside Tony -- schema knowledge cannot sit with one person. The nearest open item as of the 8 Sep checkpoint, still unnamed.', 'waiting_on_client', true, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, 'NK-P1-T14', 'Supplier contacts and current lead times', 'Needed for PO drafting in T06 and dispatch in T07/T09. Routed through Nutrition Kitchen''s procurement team, tracked against L.T. as the accountable owner.', 'waiting_on_client', false, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, 'NK-P1-T15', 'Kitchen and procurement resource for W7 and W8', 'The heaviest ask in the plan -- both parallel weeks need real kitchen and procurement time, not one or the other.', 'waiting_on_client', false, null, '2026-09-18', v_lt_id),
    (v_project_id, v_pp04_id, 'NK-P1-T16', 'Confirm Singapore audit dates', 'Per SOW-2026-001 section 4: cutover moves to the first Friday clear of the Client''s Singapore audit once those dates are confirmed. 16 October holds as the working target until this is confirmed either way.', 'waiting_on_client', true, null, '2026-09-25', v_lt_id)
  on conflict (project_id, ref) do update set
    title = excluded.title, description = excluded.description, status = excluded.status,
    is_critical_path = excluded.is_critical_path, client_visible_date = excluded.client_visible_date,
    due_date = excluded.due_date, assignee_person_id = excluded.assignee_person_id;

  -- 8b. Payment milestones, from the signed SOW-2026-001 section 7 fees
  -- table. Tracked as their own tasks (not a dedicated table -- the schema
  -- has no separate concept of a billing milestone) so they show up
  -- alongside the delivery work they're released against. M01 released at
  -- kickoff (done); M02 and M03 have not been reached yet as of today.
  insert into project_tasks (project_id, project_phase_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id) values
    (v_project_id, v_pp03_id, 'NK-P1-M01', 'M01 -- Commencement (SGD 9,400)', 'Released on MSA and SOW execution, project team mobilised, system access granted. Invoiced w/c 24 Aug 2026 per SOW-2026-001 section 7.', 'done', false, null, '2026-08-24', v_chris_id),
    (v_project_id, v_pp03_id, 'NK-P1-M02', 'M02 -- Mid-build (SGD 9,300)', 'Released when the managed database is live and Shopify/Recurly ingestion is running in test and accepted. Target w/c 14 Sep 2026 per SOW-2026-001 section 7.', 'idle', false, null, '2026-09-14', v_chris_id),
    (v_project_id, v_pp04_id, 'NK-P1-M03', 'M03 -- Singapore Go-Live (SGD 9,300)', 'Released when cutover is accepted and the approval gate is running in production. Target 16 Oct 2026 per SOW-2026-001 section 7. Total fixed fee across all three milestones: SGD 28,000 excl. GST.', 'idle', true, '2026-10-16', '2026-10-16', v_chris_id)
  on conflict (project_id, ref) do update set
    title = excluded.title, description = excluded.description, status = excluded.status,
    is_critical_path = excluded.is_critical_path, client_visible_date = excluded.client_visible_date,
    due_date = excluded.due_date, assignee_person_id = excluded.assignee_person_id;

  -- 9. Baseline: the measures greydigi is held to (kickoff deck, agenda 1) --
  insert into baselines (project_id, version, status, scope_snapshot, dates_snapshot, effort_snapshot, approved_by, approved_at)
  values (
    v_project_id, 'v1', 'approved',
    '{"workflow": "Order receipt to approved PO drafts", "measures": [
        {"metric": "Hands-on time, order receipt to approved PO drafts", "today": "Six to eight hours by hand", "after": "Under one hour of hands-on time, system run in minutes", "baselined_when": "W7 and W8 parallel weeks"},
        {"metric": "PO errors reaching production", "today": "No baseline exists, errors surface downstream", "after": "Every PO passes validation rules, a named approver and a run log", "baselined_when": "Baseline counted in W2, held in W7 and W8"},
        {"metric": "Friday cut-off, feasibility and headroom", "today": "Friday midday, never tested with suppliers", "after": "Supplier answer on record, headroom quantified in orders", "baselined_when": "Suppliers asked W2 to W3, tested W10"}
      ]}'::jsonb,
    '{"kickoff": "2026-08-24", "cutover": "2026-10-16", "first_live_release": "2026-10-19"}'::jsonb,
    '{"deploy_sprint_weeks": 8, "parallel_weeks": 2}'::jsonb,
    v_orhan_id, '2026-08-25'
  )
  on conflict (project_id, version) do update set
    status = excluded.status, scope_snapshot = excluded.scope_snapshot,
    dates_snapshot = excluded.dates_snapshot, effort_snapshot = excluded.effort_snapshot;

  -- 10. Client update, documents, client actions, view config ----------------
  -- Each client_update is a dated log entry, not a mutable summary -- the
  -- kickoff entry stays as the historical record, and the 8 Sep checkpoint
  -- is a second, newer entry, matching how the checkpoint deck itself
  -- reads (a fortnightly log, not a single status page).
  insert into client_updates (project_id, title, body, status, author_person_id, published_at)
  select v_project_id, 'Phase 1 kicked off, deploy sprint underway',
    'Kickoff held 25 August. Scope confirmed, counterparts named, and the day-one access list is out. The managed database and schema sign-off with Tony is the critical path for week one -- everything after it, including order ingestion, sits on that gate. Cutover is targeted for 16 October, once both parallel weeks (W7-W8) reconcile line by line against your own numbers.',
    'published', v_orhan_id, '2026-08-25'
  where not exists (
    select 1 from client_updates where project_id = v_project_id and title = 'Phase 1 kicked off, deploy sprint underway'
  );

  insert into client_updates (project_id, title, body, status, author_person_id, published_at)
  select v_project_id, 'Week 3 checkpoint: schema sign-off done, order ingestion under way',
    'Five migrations are on production since 4 September, and the costing engine matches Tony''s file on every golden case. Schema sign-off landed a week early, so nothing built on top of it has moved. Order ingestion is now live and mapping is unblocked -- Tony''s answers to the outstanding questions came back this week. BOM explosion and PO drafting are queued next. Cutover still holds at Friday 16 October.',
    'published', v_orhan_id, '2026-09-08'
  where not exists (
    select 1 from client_updates where project_id = v_project_id and title = 'Week 3 checkpoint: schema sign-off done, order ingestion under way'
  );

  insert into documents (workspace_id, project_id, name, kind, version, visibility)
  select v_workspace_id, null, 'aironauts (tm) Flight Plan', 'methodology', 'v0.6', 'internal'
  where not exists (
    select 1 from documents where workspace_id = v_workspace_id and project_id is null and name = 'aironauts (tm) Flight Plan'
  );

  -- Rename in place first, for the same reason as the L.T. Low email
  -- rename above: a fresh run inserts the corrected title directly, but a
  -- database that already has the old 'Shopify and Xero credentials' row
  -- (missing Recurly, which SOW-2026-001 puts in scope alongside Shopify)
  -- needs it renamed, not re-inserted as a duplicate.
  update client_actions set
    title = 'Shopify, Recurly and Xero credentials',
    description = 'API user in Xero (read/write), a private-app order token in Shopify, and Recurly API access, Singapore store. Critical path for order ingestion in W2 to W3.'
  where project_id = v_project_id and title = 'Shopify and Xero credentials';

  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'provide_information', 'Shopify, Recurly and Xero credentials',
    'API user in Xero (read/write), a private-app order token in Shopify, and Recurly API access, Singapore store. Critical path for order ingestion in W2 to W3.',
    'pending', v_lt_id, '2026-08-31 00:00:00+00', '2026-08-25 00:00:00+00'
  where not exists (
    select 1 from client_actions where project_id = v_project_id and title = 'Shopify, Recurly and Xero credentials'
  );

  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'confirm_decision', 'Schema sign-off',
    'Tony to sign off the managed database schema, codes and yield logic. The database build starts from this.',
    'pending', v_tony_id, '2026-09-07 00:00:00+00', '2026-08-25 00:00:00+00'
  where not exists (
    select 1 from client_actions where project_id = v_project_id and title = 'Schema sign-off'
  );

  -- Both actions above are resolved as of the 8 Sep checkpoint -- update
  -- rather than re-insert, since the guards above only fire once and
  -- won't touch a row that already exists from an earlier run.
  update client_actions set status = 'completed'
  where project_id = v_project_id and title = 'Shopify, Recurly and Xero credentials' and status <> 'completed';

  update client_actions set status = 'completed'
  where project_id = v_project_id and title = 'Schema sign-off' and status <> 'completed';

  insert into client_actions (project_id, kind, title, description, status, assigned_person_id, due_at, created_at)
  select v_project_id, 'confirm_decision', 'Continuity cover on the schema',
    'A second name alongside Tony for schema knowledge, so it never sits with one person. The nearest open item as of the 8 Sep checkpoint.',
    'pending', v_lt_id, '2026-09-18 00:00:00+00', '2026-09-08 00:00:00+00'
  where not exists (
    select 1 from client_actions where project_id = v_project_id and title = 'Continuity cover on the schema'
  );

  insert into client_view_configs (project_id) values (v_project_id)
  on conflict (project_id) do nothing;
  perform fn_publish_client_view(v_project_id, v_orhan_id);

end $$;

commit;
