-- Maps the dev team's SG schema build map (Cowork, status as at 7
-- September 2026, week 3 of 10) into NK-P1's own Checkpoint data tab --
-- Build-progress stats, Decisions log, This week/next week, Baseline
-- measures -- so the team can review it there before anything reaches
-- the client through Client view config.
--
-- Every row below is inserted with reviewed_at left NULL, on purpose:
-- per 0054_checkpoint_sections.sql, a row only ever reaches
-- fn_client_portal_project / fn_publish_client_view once a person marks
-- it reviewed in the Checkpoint tab. This script only stages the real
-- numbers; a reviewer still has to check each one before it can go
-- live or published, and the Client view config toggles for these four
-- sections are left exactly as they are -- turning them on is the
-- team's own call once the content is checked.
--
-- Baseline measures reuse the exact three measures already recorded in
-- the signed baseline (seed_nk_live.sql's own baselines.scope_snapshot,
-- section 9) rather than inventing new ones -- this is the same
-- before/after commitment, displayed in the Checkpoint tab's own
-- table shape.
--
-- SAFE TO RE-RUN: every insert is guarded by a "where not exists" check
-- on project_id + label/title/period_label + owner combination, so
-- running this twice does not duplicate rows.

begin;

do $$
declare
  v_project_id uuid;
begin
  select id into v_project_id from projects where ref = 'NK-P1';
  if v_project_id is null then
    raise exception 'NK-P1 project not found -- nothing to map.';
  end if;

  -- 1. Build-progress stats ---------------------------------------------
  insert into project_progress_stats (project_id, label, value, note)
  select v_project_id, 'Migrations on production', '5 of 9',
    'M1, M3, M3a, M3-seed, M4 -- live on production since 4 September, verified the same day.'
  where not exists (
    select 1 from project_progress_stats where project_id = v_project_id and label = 'Migrations on production'
  );

  insert into project_progress_stats (project_id, label, value, note)
  select v_project_id, 'Rows loaded', '40,336 rows / 14 tables',
    'Tony''s Singapore reference data (M3-seed), every load self-checked with a row count.'
  where not exists (
    select 1 from project_progress_stats where project_id = v_project_id and label = 'Rows loaded'
  );

  insert into project_progress_stats (project_id, label, value, note)
  select v_project_id, 'Costing tests passing', '139 of 139',
    'Matches Tony''s file exactly on 9 Singapore golden cases (M4, the costing engine).'
  where not exists (
    select 1 from project_progress_stats where project_id = v_project_id and label = 'Costing tests passing'
  );

  insert into project_progress_stats (project_id, label, value, note)
  select v_project_id, 'Days to cutover (as at 7 Sep status)', '39 days',
    'Cutover Friday 16 October; first live release Monday 19 October.'
  where not exists (
    select 1 from project_progress_stats where project_id = v_project_id and label = 'Days to cutover (as at 7 Sep status)'
  );

  -- 2. Decisions log ------------------------------------------------------
  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Continuity cover on the schema',
    'A second name alongside Tony, so schema knowledge doesn''t sit with one person.',
    'L.T.', 'W4', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Continuity cover on the schema'
  );

  insert into project_decisions (project_id, title, detail, owner, due_label, status)
  select v_project_id, 'Six outstanding answers for the product mapping',
    'Needed to close order-to-kitchen mapping (M6) -- the slot-code lookup is already built on a branch and waiting on these.',
    'Tony', '11 Sep', 'open'
  where not exists (
    select 1 from project_decisions where project_id = v_project_id and title = 'Six outstanding answers for the product mapping'
  );

  -- 3. This week / next week ----------------------------------------------
  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  select v_project_id, 'This week, 7 to 11 September', 'greydigi',
    '["M6, order intake mapping — in progress, waiting on Tony''s answers.", "M5, purchasing and planning tables — spec next once M6 unblocks."]'::jsonb,
    false
  where not exists (
    select 1 from project_weekly_commitments
    where project_id = v_project_id and period_label = 'This week, 7 to 11 September' and owner_label = 'greydigi'
  );

  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  select v_project_id, 'This week, 7 to 11 September', 'Nutrition Kitchen',
    '["Answer the six outstanding product-mapping questions (blocks M6).", "Name continuity cover alongside Tony for schema knowledge."]'::jsonb,
    true
  where not exists (
    select 1 from project_weekly_commitments
    where project_id = v_project_id and period_label = 'This week, 7 to 11 September' and owner_label = 'Nutrition Kitchen'
  );

  insert into project_weekly_commitments (project_id, period_label, owner_label, items, accent)
  select v_project_id, 'Next, week of 14 September', 'greydigi',
    '["M7, kitchen and procurement documents — queued behind M5.", "Gate M02 (mid-build milestone) targeted this window."]'::jsonb,
    false
  where not exists (
    select 1 from project_weekly_commitments
    where project_id = v_project_id and period_label = 'Next, week of 14 September' and owner_label = 'greydigi'
  );

  -- 4. Baseline measures ---------------------------------------------------
  -- Same three measures as the signed baseline (seed_nk_live.sql, baselines
  -- v1) -- this table just gives the Checkpoint tab its own display copy.
  insert into project_baseline_measures (project_id, measure_name, today_value, after_value, baselined_when)
  select v_project_id, 'Hands-on time, order receipt to approved PO drafts',
    'Six to eight hours by hand', 'Under one hour of hands-on time, system run in minutes', 'W7 and W8 parallel weeks'
  where not exists (
    select 1 from project_baseline_measures
    where project_id = v_project_id and measure_name = 'Hands-on time, order receipt to approved PO drafts'
  );

  insert into project_baseline_measures (project_id, measure_name, today_value, after_value, baselined_when)
  select v_project_id, 'PO errors reaching production',
    'No baseline exists, errors surface downstream', 'Every PO passes validation rules, a named approver and a run log',
    'Baseline counted in W2, held in W7 and W8'
  where not exists (
    select 1 from project_baseline_measures where project_id = v_project_id and measure_name = 'PO errors reaching production'
  );

  insert into project_baseline_measures (project_id, measure_name, today_value, after_value, baselined_when)
  select v_project_id, 'Friday cut-off, feasibility and headroom',
    'Friday midday, never tested with suppliers', 'Supplier answer on record, headroom quantified in orders',
    'Suppliers asked W2 to W3, tested W10'
  where not exists (
    select 1 from project_baseline_measures where project_id = v_project_id and measure_name = 'Friday cut-off, feasibility and headroom'
  );

end $$;

commit;

-- After this runs: open /missions/projects/nk-p1/checkpoint, review each
-- row (the numbers above are real, but only a person checking them
-- counts as reviewed here), then turn on the matching toggle on
-- /missions/projects/nk-p1/client-view-config once a section is ready
-- to share.
