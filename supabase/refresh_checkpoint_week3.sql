-- Replaces this project's Checkpoint data (project_progress_stats,
-- project_decisions, project_weekly_commitments, project_baseline_measures)
-- with the real content from NK_Core_checkpoint_20260908_8.pdf ("Week 3
-- of 10", session 8 September 2026) -- transcribed page-for-page from
-- that deck, not placeholder text. Every row is inserted already
-- reviewed (reviewed_at = now(), reviewed_by left null since no
-- specific reviewer was named) since this is exactly what was already
-- shared with the client on 8 September -- so it's immediately eligible
-- to show on the client portal or a Publish, the same "reviewed_at is
-- not null" gate every other row in these tables goes through.
--
-- Same client-lookup pattern as seed_nk_hypercare_test.sql: looks up
-- "Nutrition Kitchen" by name (case/whitespace-insensitive), falls back
-- to that client's only project if its ref isn't 'phase1'.
--
-- Clears this project's EXISTING rows in these four tables first (this
-- is a replace, not an add-alongside) -- if you want to keep whatever
-- is in there now, back it up before running this.

begin;

do $$
declare
  v_client_id uuid;
  v_client_name text;
  v_project_id uuid;
  v_project_count int;
begin
  select c.id, c.name into v_client_id, v_client_name
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

  delete from project_progress_stats where project_id = v_project_id;
  delete from project_decisions where project_id = v_project_id;
  delete from project_weekly_commitments where project_id = v_project_id;
  delete from project_baseline_measures where project_id = v_project_id;

  -- Page 3 — "Week 3 of 10: the database is live, order mapping is under way"
  insert into project_progress_stats (project_id, label, value, note, reviewed_at) values
    (v_project_id, 'Migrations done', '5 of 9', 'M1, M3, M3a, M3-seed, M4 on production. M6 in progress.', now()),
    (v_project_id, 'Rows loaded', '40,336', '14 tables from the Singapore workbooks, every load row-count checked', now()),
    (v_project_id, 'Costing tests pass', '139 / 139', 'Cost matches Tony''s file exactly on 9 Singapore golden cases', now()),
    (v_project_id, 'Working days to cutover', '28', '1 of 3 gates cleared. M02 opens in week 4.', now());

  -- Page 5 — "Six open items, and what could move 16 October"
  insert into project_decisions (project_id, title, detail, owner, due_label, status, reviewed_at) values
    (v_project_id, 'Answers to questions 9 to 15', 'Received. Six of them unblock product mapping in M6. Jun works them in this week.', 'Tony', 'Closed', 'closed', now()),
    (v_project_id, 'Continuity cover on the schema', 'A second name alongside Tony. Schema knowledge cannot sit with one person.', 'L.T.', 'W4', 'open', now()),
    (v_project_id, 'Supplier contacts and current lead times', 'PO drafting in M5, dispatch in M7.', 'Procurement', 'W4', 'open', now()),
    (v_project_id, 'Kitchen and procurement resource, W7 and W8', 'Both parallel weeks, not one or the other. The heaviest ask in the plan.', 'L.T.', 'W4', 'open', now()),
    (v_project_id, 'Named approvers for the approval gate', 'Nothing ships without a named approver. Gate build runs W5 to W7.', 'L.T.', 'W5', 'open', now()),
    (v_project_id, 'Who accepts cutover, and L.T.''s deputy', 'M03 closes on a signature, not a conversation.', 'L.T.', 'W5', 'open', now()),
    (v_project_id, 'Contracting entity for Phase 2', 'Decides the grant route. Phase 1 is unaffected.', 'L.T.', 'Before Phase 2 scoping', 'open', now());

  -- Page 6 — "Map the orders, then start the purchasing tables"
  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent, reviewed_at) values
    (
      v_project_id, 'This week, W3, 7 to 11 September', 'greydigi',
      jsonb_build_array(
        'M6, order intake mapped. Turning landed Shopify orders into the kitchen''s master rows: package, day, slot, delivery zone. Spec agreed 7 September, slot code lookup built on a branch.',
        'M5, purchasing and planning spec. Purchase orders, demand counts, production runs, seeded from the Procurement and Production Planning workbooks.'
      ),
      false, now()
    ),
    (
      v_project_id, 'Next week, W4, 14 to 18 September', 'greydigi',
      jsonb_build_array(
        'M6 closes. Product mapping complete with Tony''s answers. Live orders map end to end into master rows.',
        'M5 builds. Purchase orders, demand counts, production runs, PO drafts generated from the costing engine.',
        'Gate M02 opens. BOM engine and PO drafts reviewed with Tony. Window is W4 to W5.',
        'M7 queued. Master list, numbers, production sheet, procurement plan.'
      ),
      false, now()
    ),
    (
      v_project_id, 'From Nutrition Kitchen — commitments', 'Nutrition Kitchen',
      jsonb_build_array(
        'Tony: answers to questions 9 to 15, received. Jun confirms this week whether they close product mapping.',
        'L.T.: continuity cover named alongside Tony, in W4.',
        'Procurement: supplier contacts and current lead times, in W4.',
        'L.T.: kitchen and procurement resource confirmed for the W7 and W8 parallel weeks.',
        'Tony: available to review the BOM engine and PO drafts at gate M02.'
      ),
      true, now()
    );

  -- Page 10 — "The measures we hold ourselves to"
  insert into project_baseline_measures (project_id, measure_name, today_value, after_value, baselined_when, reviewed_at) values
    (v_project_id, 'Hands-on time, order receipt to approved PO drafts', 'Six to eight hours by hand', 'Under one hour of hands-on time, system run in minutes', 'W7 and W8 parallel weeks', now()),
    (v_project_id, 'PO errors reaching production', 'No baseline exists, errors surface downstream', 'Every PO passes validation rules, a named approver and a run log', 'Baseline counted in W2, held in W7 and W8', now()),
    (v_project_id, 'Friday cut-off, feasibility and headroom', 'Friday midday, never tested with suppliers', 'Supplier answer on record, headroom quantified in orders', 'Suppliers asked W2 to W3, tested W10', now());

  raise notice 'Checkpoint data refreshed for project % (Week 3, 8 September 2026 deck).', v_project_id;
end $$;

commit;
