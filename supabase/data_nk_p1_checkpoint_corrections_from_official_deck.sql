-- Corrects NK-P1's Checkpoint data against the OFFICIAL checkpoint deck
-- actually used in the client session ("NK Core, fortnightly checkpoint",
-- session Tuesday 8 September 2026, status as at Monday 7 September) --
-- more authoritative than the dev team's own internal SG schema build
-- map I mapped in earlier, which turns out to have been a slightly
-- earlier snapshot on the same day: the build map still showed Tony's
-- product-mapping answers as outstanding; this deck (prepared by
-- greydigi for the actual client meeting) shows them received and
-- closed, with six of them unblocking M6. Also fixes "days to cutover"
-- to the deck's own figure (28 working days), not the 39 calendar days
-- I had computed by hand.
--
-- Every row touched here stays unreviewed (reviewed_at left null) --
-- same rule as always: a person still has to check it before it can
-- reach Client view config.
--
-- SAFE TO RE-RUN: guarded by "where not exists" / exact-match "where"
-- clauses throughout.

begin;

do $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from projects where ref = 'NK-P1';
  if v_project_id is null then
    raise exception 'NK-P1 project not found -- nothing to correct.';
  end if;

  -- 1. Fix "days to cutover" -- deck says 28 working days, not 39
  --    calendar days.
  update project_progress_stats set
    label = 'Working days to cutover',
    value = '28',
    note = '1 of 3 gates cleared (M01). M02 opens in week 4.'
  where project_id = v_project_id and label = 'Days to cutover (as at 7 Sep status)';

  -- 2. The "six outstanding answers" decision I added earlier is wrong
  --    per this more authoritative deck -- those answers are received
  --    and closed, not still outstanding. Remove it; the closed item is
  --    added correctly below.
  delete from project_decisions
  where project_id = v_project_id and title = 'Six outstanding answers for the product mapping';

  -- Same correction on the client_action created alongside it.
  delete from client_actions
  where project_id = v_project_id and title = 'Six outstanding answers for the product mapping';

  -- 3. The real seven-row decisions log from the deck (page 5) -- one
  --    closed, six open.
  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Answers to questions 9 to 15',
    'Received. Six of them unblock product mapping in M6.',
    'Tony', 'Closed', 'closed'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Answers to questions 9 to 15'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Supplier contacts and current lead times',
    'PO drafting in M5, dispatch in M7.',
    'Procurement', 'W4', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Supplier contacts and current lead times'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Kitchen and procurement resource, W7 and W8',
    'Both parallel weeks, not one or the other. The heaviest ask in the plan.',
    'L.T.', 'W4', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Kitchen and procurement resource, W7 and W8'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Named approvers for the approval gate',
    'Nothing ships without a named approver. Gate build runs W5 to W7.',
    'L.T.', 'W5', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Named approvers for the approval gate'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Who accepts cutover, and L.T.''s deputy',
    'M03 closes on a signature, not a conversation.',
    'L.T.', 'W5', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Who accepts cutover, and L.T.''s deputy'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Contracting entity for Phase 2',
    'Decides the grant route. Phase 1 is unaffected.',
    'L.T.', 'Before Phase 2 scoping', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Contracting entity for Phase 2'
  );

  -- ("Continuity cover on the schema" already exists from the earlier
  -- pass and matches the deck closely enough -- left as is.)

  -- 4. Replace the three commitment cards from the earlier pass with
  --    the deck's own richer, exact three (page 6).
  delete from project_weekly_commitments
  where project_id = v_project_id and period_label in ('This week, 7 to 11 September', 'Next, week of 14 September');

  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  values (
    v_project_id, 'This week, W3, 7 to 11 September', 'greydigi',
    '["M6, order intake mapped. Turning landed Shopify orders into the kitchen''s master rows: package, day, slot, delivery zone. Spec agreed 7 September, slot code lookup built on a branch.", "M5, purchasing and planning spec. Purchase orders, demand counts, production runs, seeded from the Procurement and Production Planning workbooks."]'::jsonb,
    false
  );

  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  values (
    v_project_id, 'Next week, W4, 14 to 18 September', 'greydigi',
    '["M6 closes. Product mapping complete with Tony''s answers. Live orders map end to end into master rows.", "M5 builds. Purchase orders, demand counts, production runs, PO drafts generated from the costing engine.", "Gate M02 opens. BOM engine and PO drafts reviewed with Tony. Window is W4 to W5.", "M7 queued. Master list, numbers, production sheet, procurement plan."]'::jsonb,
    false
  );

  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  values (
    v_project_id, 'From Nutrition Kitchen', 'Nutrition Kitchen',
    '["Tony: answers to questions 9 to 15, received. Jun confirms this week whether they close product mapping.", "L.T.: continuity cover named alongside Tony, in W4.", "Procurement: supplier contacts and current lead times, in W4.", "L.T.: kitchen and procurement resource confirmed for the W7 and W8 parallel weeks.", "Tony: available to review the BOM engine and PO drafts at gate M02."]'::jsonb,
    true
  );

end $$;

commit;
