-- Project-scoped RBAC, phase 1 of 3 (see the approved plan for the full
-- rollout). Pure additive schema — no existing RLS policy is touched by
-- this migration, so applying it changes nothing about current access.
-- The actual access-narrowing RLS rewrite is 0021, applied separately
-- once project_members has been populated and tested.
--
-- Three tiers: Super Admin (existing people.workspace_role =
-- 'workspace_admin', unchanged), Project Admin (full CRUD on their
-- assigned project(s) only), Member (edits their own tasks + comments
-- anywhere in a project they belong to, everything else read-only).

create type project_member_role as enum ('project_admin', 'member');

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  role project_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, person_id)
);

create index project_members_project_idx on project_members (project_id);
create index project_members_person_idx on project_members (person_id);

alter table project_members enable row level security;

-- Any internal workspace member can read who's on a project (project
-- pages need to list membership); only an admin can change it.
create policy project_members_read on project_members for select
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

-- Helper 1: true workspace_admin escape hatch, reused by every helper
-- below instead of repeating the subquery inline.
create or replace function fn_is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from people
    where auth_user_id = auth.uid() and workspace_role = 'workspace_admin'
  );
$$;

-- Helper 2: project ids the current internal user may READ. workspace_admin
-- implicitly gets every project in their workspace; everyone else gets
-- only projects they hold a project_members row on.
create or replace function fn_my_accessible_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from projects p
  where p.workspace_id in (select fn_my_internal_workspace_ids())
    and fn_is_workspace_admin()
  union
  select pm.project_id from project_members pm
  join people me on me.id = pm.person_id
  where me.auth_user_id = auth.uid();
$$;

-- Helper 3: project ids the current user may WRITE to at admin level
-- (workspace_admin, or project_admin on that specific project). Member's
-- narrower "only my own tasks" exception is expressed directly in 0021's
-- project_tasks policy, not through this helper.
create or replace function fn_my_admin_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from projects p
  where p.workspace_id in (select fn_my_internal_workspace_ids())
    and fn_is_workspace_admin()
  union
  select pm.project_id from project_members pm
  join people me on me.id = pm.person_id
  where me.auth_user_id = auth.uid() and pm.role = 'project_admin';
$$;

create policy project_members_write on project_members for insert
  with check (project_id in (select fn_my_admin_project_ids()));
create policy project_members_update on project_members for update
  using (project_id in (select fn_my_admin_project_ids()));
create policy project_members_delete on project_members for delete
  using (project_id in (select fn_my_admin_project_ids()));

-- Hypercare + clients scoping helper: every client id a non-admin can
-- reach via a project they're a member of, plus every client for a
-- workspace_admin. Used by 0021 to scope services/incidents/support
-- requests/escalations and the clients table itself.
create or replace function fn_my_accessible_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from clients c
  where c.workspace_id in (select fn_my_internal_workspace_ids())
    and fn_is_workspace_admin()
  union
  select p.client_id from projects p
  where p.id in (select fn_my_accessible_project_ids());
$$;

-- Product scoping: Product has no client_id (deliberately reusable across
-- clients — see src/lib/data/shell.ts), so it can't key off project
-- membership. Reuses the previously-inert space_roles table as the
-- Product-space membership grant instead of inventing a new one.
create or replace function fn_my_product_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_is_workspace_admin() or exists (
    select 1 from space_roles sr
    join people me on me.id = sr.person_id
    where me.auth_user_id = auth.uid() and sr.space = 'product'
  );
$$;

-- space_roles had no write policy at all before this migration (confirmed
-- via a full RLS audit) — only a workspace_admin can grant/revoke Product
-- access.
create policy space_roles_write on space_roles for insert
  with check (fn_is_workspace_admin());
create policy space_roles_update on space_roles for update
  using (fn_is_workspace_admin());
create policy space_roles_delete on space_roles for delete
  using (fn_is_workspace_admin());
