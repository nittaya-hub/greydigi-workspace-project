-- EMERGENCY ROLLBACK of 0022_project_scoped_rls_rewrite.sql.
--
-- 0022 was applied to production before project_members/space_roles were
-- populated for the real team, which means every internal person except
-- workspace_admin lost read/write access to essentially everything
-- (Delivery, Hypercare, Product, and the client list) the moment it ran.
-- This migration restores exactly the pre-0022 policies (verbatim from
-- 0007_rls.sql / 0012_clients_write_rls.sql), so the team is unblocked
-- immediately. Run this NOW.
--
-- After this runs: populate project_members (one row per person per
-- project they should have access to) and grant space_roles for
-- 'product' to whoever needs Product access, THEN re-apply 0022 — do not
-- re-run 0022 again until that data exists, and this time validate on
-- staging first per the plan
-- (/Users/nittayaprakhamsai/.claude/plans/wobbly-popping-milner.md).

-- Drop every policy 0022 created.
drop policy if exists projects_internal_read on projects;
drop policy if exists projects_internal_write on projects;
drop policy if exists projects_internal_update on projects;
drop policy if exists project_phases_read on project_phases;
drop policy if exists project_phases_insert on project_phases;
drop policy if exists project_phases_update on project_phases;
drop policy if exists project_phases_delete on project_phases;
drop policy if exists project_gates_read on project_gates;
drop policy if exists project_gates_insert on project_gates;
drop policy if exists project_gates_update on project_gates;
drop policy if exists project_gates_delete on project_gates;
drop policy if exists project_gate_conditions_read on project_gate_conditions;
drop policy if exists project_gate_conditions_insert on project_gate_conditions;
drop policy if exists project_gate_conditions_update on project_gate_conditions;
drop policy if exists project_gate_conditions_delete on project_gate_conditions;
drop policy if exists project_tasks_read on project_tasks;
drop policy if exists project_tasks_insert on project_tasks;
drop policy if exists project_tasks_update on project_tasks;
drop policy if exists project_tasks_delete on project_tasks;
drop policy if exists baselines_read on baselines;
drop policy if exists baselines_insert on baselines;
drop policy if exists baselines_update on baselines;
drop policy if exists baselines_delete on baselines;
drop policy if exists change_requests_read on change_requests;
drop policy if exists change_requests_insert on change_requests;
drop policy if exists change_requests_update on change_requests;
drop policy if exists change_requests_delete on change_requests;
drop policy if exists documents_internal_read on documents;
drop policy if exists documents_internal_insert on documents;
drop policy if exists documents_internal_update on documents;
drop policy if exists documents_internal_delete on documents;
drop policy if exists client_updates_internal_read on client_updates;
drop policy if exists client_updates_internal_insert on client_updates;
drop policy if exists client_updates_internal_update on client_updates;
drop policy if exists client_updates_internal_delete on client_updates;
drop policy if exists client_view_configs_internal on client_view_configs;
drop policy if exists share_links_internal on share_links;
drop policy if exists share_link_views_internal on share_link_views;
drop policy if exists client_actions_internal_read on client_actions;
drop policy if exists client_actions_internal_insert on client_actions;
drop policy if exists client_actions_internal_update on client_actions;
drop policy if exists client_actions_internal_delete on client_actions;
drop policy if exists client_signatures_internal_read on client_signatures;
drop policy if exists client_signatures_internal_insert on client_signatures;
drop policy if exists client_signatures_internal_update on client_signatures;
drop policy if exists client_signatures_internal_delete on client_signatures;
drop policy if exists task_comments_read on task_comments;
drop policy if exists task_comments_insert on task_comments;
drop policy if exists task_comments_update_own on task_comments;
drop policy if exists task_comments_delete_own on task_comments;
drop policy if exists task_custom_fields_internal on task_custom_fields;
drop policy if exists task_custom_field_values_read on task_custom_field_values;
drop policy if exists task_custom_field_values_insert on task_custom_field_values;
drop policy if exists task_custom_field_values_update on task_custom_field_values;
drop policy if exists services_internal on services;
drop policy if exists sla_policies_internal on sla_policies;
drop policy if exists incidents_internal on incidents;
drop policy if exists support_requests_internal on support_requests;
drop policy if exists incident_pauses_internal on incident_pauses;
drop policy if exists health_checks_internal on health_checks;
drop policy if exists escalations_internal on escalations;
drop policy if exists clients_read on clients;
drop policy if exists clients_internal_insert on clients;
drop policy if exists clients_internal_update on clients;
drop policy if exists clients_internal_delete on clients;
drop policy if exists products_internal on products;
drop policy if exists releases_internal on releases;
drop policy if exists roadmap_items_internal on roadmap_items;
drop policy if exists project_release_dependencies_internal on project_release_dependencies;
drop policy if exists engineering_tasks_internal on engineering_tasks;
drop policy if exists release_criteria_internal on release_criteria;

-- Recreate the original policies, verbatim from 0007_rls.sql /
-- 0012_clients_write_rls.sql.

create policy projects_internal_read on projects for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

-- projects_client_read was never touched by 0022 (it stayed in place the
-- whole time) — nothing to restore for it.

create policy projects_internal_write on projects for insert with check (workspace_id in (select fn_my_internal_workspace_ids()));
create policy projects_internal_update on projects for update using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy project_phases_internal on project_phases for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy project_gates_internal on project_gates for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy project_gate_conditions_internal on project_gate_conditions for all
  using (project_gate_id in (select id from project_gates));

create policy project_tasks_internal on project_tasks for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy baselines_internal on baselines for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy change_requests_internal on change_requests for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy documents_internal on documents for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy client_updates_internal on client_updates for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_view_configs_internal on client_view_configs for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy share_links_internal on share_links for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy share_link_views_internal on share_link_views for select
  using (share_link_id in (select sl.id from share_links sl join projects p on p.id = sl.project_id where p.workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_actions_internal on client_actions for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_signatures_internal on client_signatures for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy task_comments_internal on task_comments for all
  using (
    task_id in (
      select pt.id from project_tasks pt
      join projects p on p.id = pt.project_id
      where p.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

create policy task_custom_fields_internal on task_custom_fields for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy task_custom_field_values_internal on task_custom_field_values for all
  using (
    field_id in (
      select id from task_custom_fields
      where project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids()))
    )
  );

create policy services_internal on services for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy sla_policies_internal on sla_policies for all
  using (service_id in (select id from services where workspace_id in (select fn_my_internal_workspace_ids())));

create policy incidents_internal on incidents for all
  using (service_id in (select id from services where workspace_id in (select fn_my_internal_workspace_ids())));

create policy support_requests_internal on support_requests for all
  using (service_id in (select id from services where workspace_id in (select fn_my_internal_workspace_ids())));

create policy incident_pauses_internal on incident_pauses for all
  using (incident_id in (select id from incidents));

create policy health_checks_internal on health_checks for all
  using (service_id in (select id from services where workspace_id in (select fn_my_internal_workspace_ids())));

create policy escalations_internal on escalations for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy clients_read on clients for select
  using (
    workspace_id in (select fn_my_internal_workspace_ids())
    or id in (select fn_my_client_ids())
  );

create policy clients_internal on clients for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy products_internal on products for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy releases_internal on releases for all
  using (product_id in (select id from products where workspace_id in (select fn_my_internal_workspace_ids())));

create policy roadmap_items_internal on roadmap_items for all
  using (product_id in (select id from products where workspace_id in (select fn_my_internal_workspace_ids())));

create policy project_release_dependencies_internal on project_release_dependencies for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy engineering_tasks_internal on engineering_tasks for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy release_criteria_internal on release_criteria for all
  using (
    release_id in (
      select r.id from releases r
      join products p on p.id = r.product_id
      where p.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );
