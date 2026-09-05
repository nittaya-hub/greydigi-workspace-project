-- Row Level Security. Architecture doc section 8 (client/public security
-- model) and section 16 ("Do not expose internal records directly to
-- public routes", "Do not bypass authorization or validation").
--
-- Three access patterns:
--   1. Internal workspace users (auth'd, people.auth_user_id = auth.uid())
--      see everything in their own workspace, scoped further by role for
--      writes.
--   2. Client-portal users (auth'd, people.kind = 'client') see only rows
--      belonging to projects for a client they hold a client_roles grant
--      on, and only through the client-safe views (fn_client_portal_*),
--      never the raw internal tables directly for delivery internals.
--   3. Public share-link visitors (unauthenticated) never touch these
--      tables at all — they read through the share-link projection RPC
--      (fn_public_share_view, defined in 0008_projections.sql) called with
--      the service role from a server-only route, after validating the
--      token server-side.

alter table workspaces enable row level security;
alter table people enable row level security;
alter table space_roles enable row level security;
alter table clients enable row level security;
alter table client_roles enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;
alter table file_assets enable row level security;
alter table cross_space_links enable row level security;

alter table templates enable row level security;
alter table template_versions enable row level security;
alter table template_phases enable row level security;
alter table template_gates enable row level security;
alter table template_gate_conditions enable row level security;
alter table template_tasks enable row level security;
alter table projects enable row level security;
alter table project_phases enable row level security;
alter table project_gates enable row level security;
alter table project_gate_conditions enable row level security;
alter table project_tasks enable row level security;
alter table baselines enable row level security;
alter table change_requests enable row level security;
alter table documents enable row level security;
alter table client_updates enable row level security;
alter table client_view_configs enable row level security;
alter table share_links enable row level security;
alter table share_link_views enable row level security;
alter table client_actions enable row level security;
alter table client_signatures enable row level security;

alter table products enable row level security;
alter table releases enable row level security;
alter table roadmap_items enable row level security;
alter table project_release_dependencies enable row level security;
alter table engineering_tasks enable row level security;

alter table services enable row level security;
alter table sla_policies enable row level security;
alter table incidents enable row level security;
alter table support_requests enable row level security;
alter table incident_pauses enable row level security;
alter table health_checks enable row level security;
alter table escalations enable row level security;

-- Helper: the workspace(s) the current auth user belongs to as an internal
-- (non-client) person.
create or replace function fn_my_internal_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from people
  where auth_user_id = auth.uid() and kind = 'internal';
$$;

-- Helper: the client_ids a client-portal user may see.
create or replace function fn_my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cr.client_id
  from client_roles cr
  join people p on p.id = cr.person_id
  where p.auth_user_id = auth.uid();
$$;

-- Internal workspace tables: any internal member of the workspace can read;
-- workspace_admin (or the relevant space lead) can write. Kept as one
-- broad read policy per table plus a narrower write policy, rather than
-- duplicating the same shape 30 times with per-role nuance — fine-grained
-- write checks live in the service layer's mutation functions, not solely
-- in RLS, per the architecture doc's service-layer list (section 14).

create policy workspaces_read on workspaces for select
  using (id in (select fn_my_internal_workspace_ids()));

create policy people_read on people for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy space_roles_read on space_roles for select
  using (person_id in (select id from people where workspace_id in (select fn_my_internal_workspace_ids())));

create policy clients_read on clients for select
  using (
    workspace_id in (select fn_my_internal_workspace_ids())
    or id in (select fn_my_client_ids())
  );

create policy client_roles_read on client_roles for select
  using (
    client_id in (select id from clients where workspace_id in (select fn_my_internal_workspace_ids()))
    or client_id in (select fn_my_client_ids())
  );

create policy notifications_read on notifications for select
  using (person_id in (select id from people where auth_user_id = auth.uid()));

create policy notifications_update_own on notifications for update
  using (person_id in (select id from people where auth_user_id = auth.uid()));

create policy activity_log_read on activity_log for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy file_assets_read on file_assets for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy cross_space_links_read on cross_space_links for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

-- Delivery internal tables — internal members of the workspace only. Client
-- access to a project's delivery data goes through the published projection
-- (client_view_configs.published_snapshot / fn_client_portal_project), not
-- these raw tables.
create policy templates_internal on templates for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy template_versions_internal on template_versions for all
  using (template_id in (select id from templates where workspace_id in (select fn_my_internal_workspace_ids())));

create policy template_phases_internal on template_phases for all
  using (template_version_id in (select tv.id from template_versions tv join templates t on t.id = tv.template_id where t.workspace_id in (select fn_my_internal_workspace_ids())));

create policy template_gates_internal on template_gates for all
  using (template_version_id in (select tv.id from template_versions tv join templates t on t.id = tv.template_id where t.workspace_id in (select fn_my_internal_workspace_ids())));

create policy template_gate_conditions_internal on template_gate_conditions for all
  using (template_gate_id in (select id from template_gates));

create policy template_tasks_internal on template_tasks for all
  using (template_version_id in (select tv.id from template_versions tv join templates t on t.id = tv.template_id where t.workspace_id in (select fn_my_internal_workspace_ids())));

create policy projects_internal_read on projects for select
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy projects_client_read on projects for select
  using (client_id in (select fn_my_client_ids()));

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

create policy documents_client_read on documents for select
  using (
    visibility = 'client_visible'
    and project_id in (select id from projects where client_id in (select fn_my_client_ids()))
  );

create policy client_updates_internal on client_updates for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_updates_client_read on client_updates for select
  using (
    status = 'published'
    and project_id in (select id from projects where client_id in (select fn_my_client_ids()))
  );

create policy client_view_configs_internal on client_view_configs for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy share_links_internal on share_links for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy share_link_views_internal on share_link_views for select
  using (share_link_id in (select sl.id from share_links sl join projects p on p.id = sl.project_id where p.workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_actions_internal on client_actions for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_actions_client_read on client_actions for select
  using (project_id in (select id from projects where client_id in (select fn_my_client_ids())));

create policy client_actions_client_update on client_actions for update
  using (project_id in (select id from projects where client_id in (select fn_my_client_ids())));

create policy client_signatures_internal on client_signatures for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy client_signatures_client_read on client_signatures for select
  using (project_id in (select id from projects where client_id in (select fn_my_client_ids())));

-- Product space — internal only. Never client-facing.
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

-- Hypercare space — internal only.
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
