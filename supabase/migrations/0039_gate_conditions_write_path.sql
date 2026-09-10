-- Two fixes, both on the gate-conditions tables:
--
-- 1. RLS scoping gap (the opposite failure mode from file_assets in
-- 0038 -- too permissive here, not too restrictive). Both
-- `project_gate_conditions_internal` (0007_rls.sql, restored verbatim by
-- 0023_emergency_rollback_rls_rewrite.sql) and `template_gate_conditions_
-- internal` (0007_rls.sql, never touched again) filter only by
-- "the gate id exists in project_gates / template_gates" -- with no
-- workspace join at all, that's every gate in every workspace. Every
-- sibling `_internal` policy in the schema chains back to
-- `workspace_id in (select fn_my_internal_workspace_ids())`; these two
-- didn't. Unexploited so far only because nothing writes to
-- project_gate_conditions yet (fixed by this same migration) and
-- template_gate_conditions writes go through code that doesn't check
-- workspace ownership either -- the RLS gap was the only backstop, and
-- it wasn't one.
drop policy if exists project_gate_conditions_internal on project_gate_conditions;
create policy project_gate_conditions_internal on project_gate_conditions for all
  using (
    project_gate_id in (
      select pg.id from project_gates pg
      join projects p on p.id = pg.project_id
      where p.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

drop policy if exists template_gate_conditions_internal on template_gate_conditions;
create policy template_gate_conditions_internal on template_gate_conditions for all
  using (
    template_gate_id in (
      select tg.id from template_gates tg
      join template_versions tv on tv.id = tg.template_version_id
      join templates t on t.id = tv.template_id
      where t.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

-- 2. The Flight plan check page has advertised an override feature since
-- it was built ("A failing condition can be overridden by a workspace
-- admin with a written reason") but nothing ever wrote to this table --
-- there was no write path and no column to hold the reason. These three
-- columns back the real write path added alongside this migration
-- (src/app/(app)/delivery/projects/[ref]/flight-plan-check/actions.ts).
alter table project_gate_conditions
  add column waived_by uuid references people (id) on delete set null,
  add column waived_reason text,
  add column waived_at timestamptz;
