-- Real content from the NK Core fortnightly checkpoint deck (session
-- 2026-09-08, "Week 3 of 10") for the Nutrition Kitchen project (ref
-- PHASE1) -- typed in from the actual PDF, not placeholder text.
--
-- Every row is left UNREVIEWED on purpose (reviewed_at/reviewed_by stay
-- null): per the Checkpoint data tab's own workflow, nothing here
-- reaches the client -- live portal or Publish -- until someone opens
-- Delivery > PHASE1 > Checkpoint data and clicks "Mark reviewed" on each
-- section. That's a deliberate human check, not a step this script
-- skips by accident.
--
-- Safe to re-run: each block deletes only the checkpoint rows this
-- script itself would insert for this project before inserting, so
-- running it twice doesn't duplicate rows. It does NOT touch rows
-- someone already typed in and reviewed by hand through the app --
-- those aren't part of what this script deletes.

do $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from projects where ref ilike 'PHASE1';
  if v_project_id is null then
    raise exception 'Project with ref PHASE1 not found -- check the ref in Delivery > Projects first.';
  end if;

  -- Build-progress stats (deck page 3)
  delete from project_progress_stats where project_id = v_project_id;
  insert into project_progress_stats (project_id, label, value, note) values
    (v_project_id, 'Migrations done', '5 of 9', 'M1, M3, M3a, M3-seed, M4 on production. M6 in progress.'),
    (v_project_id, 'Rows loaded', '40,336', '14 tables from the Singapore workbooks, every load row-count checked.'),
    (v_project_id, 'Costing tests pass', '139 / 139', 'Cost matches Tony''s file exactly on 9 Singapore golden cases.'),
    (v_project_id, 'Working days to cutover', '28', '1 of 3 gates cleared. M02 opens in week 4.');

  -- Decisions log (deck page 5)
  delete from project_decisions where project_id = v_project_id;
  insert into project_decisions (project_id, title, detail, owner, due_label, status) values
    (v_project_id, 'Answers to questions 9 to 15', 'Received. Six of them unblock product mapping in M6. Jun works them this week.', 'Tony', 'Closed', 'closed'),
    (v_project_id, 'Continuity cover on the schema', 'A second name alongside Tony. Schema knowledge cannot sit with one person.', 'L.T.', 'W4', 'open'),
    (v_project_id, 'Supplier contacts and current lead times', 'PO drafting in M5, dispatch in M7.', 'Procurement', 'W4', 'open'),
    (v_project_id, 'Kitchen and procurement resource, W7 and W8', 'Both parallel weeks, not one or the other. The heaviest ask in the plan.', 'L.T.', 'W4', 'open'),
    (v_project_id, 'Named approvers for the approval gate', 'Nothing ships without a named approver. Gate build runs W5 to W7.', 'L.T.', 'W5', 'open'),
    (v_project_id, 'Who accepts cutover, and L.T.''s deputy', 'M03 closes on a signature, not a conversation.', 'L.T.', 'W5', 'open'),
    (v_project_id, 'Contracting entity for Phase 2', 'Decides the grant route. Phase 1 is unaffected.', 'L.T.', 'Before Phase 2 scoping', 'open');

  -- This week / next week commitments (deck page 6)
  delete from project_weekly_commitments where project_id = v_project_id;
  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent) values
    (
      v_project_id,
      'This week, W3, 7 to 11 September',
      'greydigi',
      '[
        "M6, order intake mapped. Turning landed Shopify orders into the kitchen''s master rows: package, day, slot, delivery zone. Spec agreed 7 September, slot code lookup built on a branch.",
        "M5, purchasing and planning spec. Purchase orders, demand counts, production runs, seeded from the Procurement and Production Planning workbooks."
      ]'::jsonb,
      false
    ),
    (
      v_project_id,
      'Next week, W4, 14 to 18 September',
      'greydigi',
      '[
        "M6 closes. Product mapping complete with Tony''s answers. Live orders map end to end into master rows.",
        "M5 builds. Purchase orders, demand counts, production runs, PO drafts generated from the costing engine.",
        "Gate M02 opens. BOM engine and PO drafts reviewed with Tony. Window is W4 to W5.",
        "M7 queued. Master list, numbers, production sheet, procurement plan."
      ]'::jsonb,
      false
    ),
    (
      v_project_id,
      'From Nutrition Kitchen',
      'Nutrition Kitchen',
      '[
        "Tony: answers to questions 9 to 15, received. Jun confirms this week whether they close product mapping.",
        "L.T.: continuity cover named alongside Tony, in W4.",
        "Procurement: supplier contacts and current lead times, in W4.",
        "L.T.: kitchen and procurement resource confirmed for the W7 and W8 parallel weeks.",
        "Tony: available to review the BOM engine and PO drafts at gate M02."
      ]'::jsonb,
      true
    );

  -- Baseline measures (deck page 10)
  delete from project_baseline_measures where project_id = v_project_id;
  insert into project_baseline_measures (project_id, measure_name, today_value, after_value, baselined_when) values
    (v_project_id, 'Hands-on time, order receipt to approved PO drafts', 'Six to eight hours by hand', 'Under one hour of hands-on time, system run in minutes', 'W7 and W8 parallel weeks'),
    (v_project_id, 'PO errors reaching production', 'No baseline exists, errors surface downstream', 'Every PO passes validation rules, a named approver and a run log', 'Baseline counted in W2, held in W7 and W8'),
    (v_project_id, 'Friday cut-off, feasibility and headroom', 'Friday midday, never tested with suppliers', 'Supplier answer on record, headroom quantified in orders', 'Suppliers asked W2 to W3, tested W10');
end $$;
