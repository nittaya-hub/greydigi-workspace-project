-- Project-scoped RBAC, phase 3 of 3 — THE ACCESS-NARROWING REWRITE.
--
-- DO NOT RUN THIS AGAINST PRODUCTION DIRECTLY. Apply it to a staging
-- Supabase project (or a branch seeded from a production snapshot) first,
-- run the six-step verification in the approved plan
-- (/Users/nittayaprakhamsai/.claude/plans/wobbly-popping-milner.md), and
-- only then apply it to the database holding Nutrition Kitchen's live
-- data. Every project_members / space_roles grant needed for real people
-- to keep working must already exist before this runs (Phase 1 + 2).
--
-- Unlike 0020/0021 (pure additions), every statement below narrows
-- existing access. Each `<table>_internal for all` policy from
-- 0007_rls.sql implicitly granted unrestricted SELECT to any internal
-- workspace member (Postgres ORs every applicable policy per command,
-- and "for all" covers select too) — narrowing only the read policy
-- while leaving that permissive "for all" policy in place would do
-- nothing, so every rewritten table below explicitly drops its old
-- "_internal"/"_internal_write" policy and replaces it with separate
-- select/insert/update/delete policies.
--
-- Rollback: re-run the original `create policy` bodies from
-- 0007_rls.sql / 0012_clients_write_rls.sql verbatim for the same table +
-- policy names (see the plan's "Rollback" section).

-- ============================================================
-- Delivery: projects and everything hanging off a project_id
-- ============================================================

drop policy if exists projects_internal_read on projects;
create policy projects_internal_read on projects for select
  using (id in (select fn_my_accessible_project_ids()));

drop policy if exists projects_internal_write on projects;
create policy projects_internal_write on projects for insert
  with check (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());

drop policy if exists projects_internal_update on projects;
create policy projects_internal_update on projects for update
  using (id in (select fn_my_admin_project_ids()));

drop policy if exists project_phases_internal on project_phases;
create policy project_phases_read on project_phases for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_phases_insert on project_phases for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_phases_update on project_phases for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_phases_delete on project_phases for delete
  using (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_gates_internal on project_gates;
create policy project_gates_read on project_gates for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_gates_insert on project_gates for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_gates_update on project_gates for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_gates_delete on project_gates for delete
  using (project_id in (select fn_my_admin_project_ids()));

drop policy if exists project_gate_conditions_internal on project_gate_conditions;
create policy project_gate_conditions_read on project_gate_conditions for select
  using (project_gate_id in (select id from project_gates where project_id in (select fn_my_accessible_project_ids())));
create policy project_gate_conditions_insert on project_gate_conditions for insert
  with check (project_gate_id in (select id from project_gates where project_id in (select fn_my_admin_project_ids())));
create policy project_gate_conditions_update on project_gate_conditions for update
  using (project_gate_id in (select id from project_gates where project_id in (select fn_my_admin_project_ids())));
create policy project_gate_conditions_delete on project_gate_conditions for delete
  using (project_gate_id in (select id from project_gates where project_id in (select fn_my_admin_project_ids())));

-- Member exception: full CRUD on tasks they're assigned to, within a
-- project they belong to; everything else on this table is admin-only.
drop policy if exists project_tasks_internal on project_tasks;
create policy project_tasks_read on project_tasks for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy project_tasks_insert on project_tasks for insert
  with check (
    project_id in (select fn_my_admin_project_ids())
    or (project_id in (select fn_my_accessible_project_ids())
        and assignee_person_id in (select id from people where auth_user_id = auth.uid()))
  );
create policy project_tasks_update on project_tasks for update
  using (
    project_id in (select fn_my_admin_project_ids())
    or (project_id in (select fn_my_accessible_project_ids())
        and assignee_person_id in (select id from people where auth_user_id = auth.uid()))
  );
create policy project_tasks_delete on project_tasks for delete
  using (
    project_id in (select fn_my_admin_project_ids())
    or (project_id in (select fn_my_accessible_project_ids())
        and assignee_person_id in (select id from people where auth_user_id = auth.uid()))
  );

drop policy if exists baselines_internal on baselines;
create policy baselines_read on baselines for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy baselines_insert on baselines for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy baselines_update on baselines for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy baselines_delete on baselines for delete
  using (project_id in (select fn_my_admin_project_ids()));

drop policy if exists change_requests_internal on change_requests;
create policy change_requests_read on change_requests for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy change_requests_insert on change_requests for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy change_requests_update on change_requests for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy change_requests_delete on change_requests for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- documents_client_read (0007_rls.sql) is untouched — only the internal
-- half is rewritten here.
drop policy if exists documents_internal on documents;
create policy documents_internal_read on documents for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy documents_internal_insert on documents for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy documents_internal_update on documents for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy documents_internal_delete on documents for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- client_updates_client_read (0007_rls.sql) is untouched.
drop policy if exists client_updates_internal on client_updates;
create policy client_updates_internal_read on client_updates for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy client_updates_internal_insert on client_updates for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy client_updates_internal_update on client_updates for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy client_updates_internal_delete on client_updates for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- Publishing what a client sees is admin-only, no Member read exception —
-- a Member editing their own tasks has no reason to see draft publish
-- config for the whole project.
drop policy if exists client_view_configs_internal on client_view_configs;
create policy client_view_configs_internal on client_view_configs for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists share_links_internal on share_links;
create policy share_links_internal on share_links for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists share_link_views_internal on share_link_views;
create policy share_link_views_internal on share_link_views for select
  using (share_link_id in (select id from share_links where project_id in (select fn_my_admin_project_ids())));

-- client_actions_client_read / client_actions_client_update (0007_rls.sql)
-- are untouched.
drop policy if exists client_actions_internal on client_actions;
create policy client_actions_internal_read on client_actions for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy client_actions_internal_insert on client_actions for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy client_actions_internal_update on client_actions for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy client_actions_internal_delete on client_actions for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- client_signatures_client_read (0007_rls.sql) is untouched.
drop policy if exists client_signatures_internal on client_signatures;
create policy client_signatures_internal_read on client_signatures for select
  using (project_id in (select fn_my_accessible_project_ids()));
create policy client_signatures_internal_insert on client_signatures for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy client_signatures_internal_update on client_signatures for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy client_signatures_internal_delete on client_signatures for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- task_comments: any project member can read + post; editing/deleting
-- someone else's comment needs project_admin.
drop policy if exists task_comments_internal on task_comments;
create policy task_comments_read on task_comments for select
  using (task_id in (select id from project_tasks where project_id in (select fn_my_accessible_project_ids())));
create policy task_comments_insert on task_comments for insert
  with check (task_id in (select id from project_tasks where project_id in (select fn_my_accessible_project_ids())));
create policy task_comments_update_own on task_comments for update
  using (
    author_person_id in (select id from people where auth_user_id = auth.uid())
    or task_id in (select id from project_tasks where project_id in (select fn_my_admin_project_ids()))
  );
create policy task_comments_delete_own on task_comments for delete
  using (
    author_person_id in (select id from people where auth_user_id = auth.uid())
    or task_id in (select id from project_tasks where project_id in (select fn_my_admin_project_ids()))
  );

-- task_custom_fields (the column definitions) are schema-defining,
-- admin-only. task_custom_field_values follow the task's own read scope —
-- any project member can fill in a value on a task they can see.
drop policy if exists task_custom_fields_internal on task_custom_fields;
create policy task_custom_fields_internal on task_custom_fields for all
  using (project_id in (select fn_my_admin_project_ids()))
  with check (project_id in (select fn_my_admin_project_ids()));

drop policy if exists task_custom_field_values_internal on task_custom_field_values;
create policy task_custom_field_values_read on task_custom_field_values for select
  using (
    field_id in (
      select id from task_custom_fields where project_id in (select fn_my_accessible_project_ids())
    )
  );
create policy task_custom_field_values_insert on task_custom_field_values for insert
  with check (
    field_id in (
      select id from task_custom_fields where project_id in (select fn_my_accessible_project_ids())
    )
  );
create policy task_custom_field_values_update on task_custom_field_values for update
  using (
    field_id in (
      select id from task_custom_fields where project_id in (select fn_my_accessible_project_ids())
    )
  );

-- ============================================================
-- Hypercare: scoped by client via fn_my_accessible_client_ids()
-- ============================================================

drop policy if exists services_internal on services;
create policy services_internal on services for all
  using (client_id in (select fn_my_accessible_client_ids()))
  with check (client_id in (select fn_my_accessible_client_ids()));

drop policy if exists sla_policies_internal on sla_policies;
create policy sla_policies_internal on sla_policies for all
  using (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())))
  with check (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())));

drop policy if exists incidents_internal on incidents;
create policy incidents_internal on incidents for all
  using (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())))
  with check (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())));

drop policy if exists support_requests_internal on support_requests;
create policy support_requests_internal on support_requests for all
  using (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())))
  with check (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())));

drop policy if exists incident_pauses_internal on incident_pauses;
create policy incident_pauses_internal on incident_pauses for all
  using (
    incident_id in (
      select i.id from incidents i
      join services s on s.id = i.service_id
      where s.client_id in (select fn_my_accessible_client_ids())
    )
  );

drop policy if exists health_checks_internal on health_checks;
create policy health_checks_internal on health_checks for all
  using (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())))
  with check (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())));

drop policy if exists escalations_internal on escalations;
create policy escalations_internal on escalations for all
  using (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())))
  with check (service_id in (select id from services where client_id in (select fn_my_accessible_client_ids())));

-- ============================================================
-- Clients table itself
-- ============================================================

drop policy if exists clients_read on clients;
create policy clients_read on clients for select
  using (
    id in (select fn_my_accessible_client_ids())
    or id in (select fn_my_client_ids())
  );

-- clients_internal (0012_clients_write_rls.sql) was "for all", which
-- implicitly re-granted unrestricted select alongside clients_read above
-- — drop it and recreate as write-only, admin-gated, so clients_read is
-- the only thing governing who can see a client row.
drop policy if exists clients_internal on clients;
create policy clients_internal_insert on clients for insert
  with check (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());
create policy clients_internal_update on clients for update
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());
create policy clients_internal_delete on clients for delete
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());

-- ============================================================
-- Product: scoped by fn_my_product_access() (space_roles-backed)
-- ============================================================

drop policy if exists products_internal on products;
create policy products_internal on products for all
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_my_product_access())
  with check (workspace_id in (select fn_my_internal_workspace_ids()) and fn_my_product_access());

drop policy if exists releases_internal on releases;
create policy releases_internal on releases for all
  using (product_id in (select id from products where fn_my_product_access()))
  with check (product_id in (select id from products where fn_my_product_access()));

drop policy if exists roadmap_items_internal on roadmap_items;
create policy roadmap_items_internal on roadmap_items for all
  using (product_id in (select id from products where fn_my_product_access()))
  with check (product_id in (select id from products where fn_my_product_access()));

drop policy if exists project_release_dependencies_internal on project_release_dependencies;
create policy project_release_dependencies_internal on project_release_dependencies for all
  using (project_id in (select fn_my_accessible_project_ids()) and fn_my_product_access())
  with check (project_id in (select fn_my_accessible_project_ids()) and fn_my_product_access());

drop policy if exists engineering_tasks_internal on engineering_tasks;
create policy engineering_tasks_internal on engineering_tasks for all
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_my_product_access())
  with check (workspace_id in (select fn_my_internal_workspace_ids()) and fn_my_product_access());

drop policy if exists release_criteria_internal on release_criteria;
create policy release_criteria_internal on release_criteria for all
  using (
    release_id in (
      select r.id from releases r join products p on p.id = r.product_id where fn_my_product_access()
    )
  );
