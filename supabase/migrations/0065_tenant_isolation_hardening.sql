-- Decision #2 (multi-tenancy): "every table carries workspace_id, but
-- admin actions never check that a target record belongs to the
-- caller's own workspace" -- the app-layer half of this fix landed in
-- people/actions.ts, clients/[id]/actions.ts, hangar/products/actions.ts
-- and missions/projects/[ref]/members/actions.ts. This is the
-- database-level half: two RLS gaps a code audit found that the app
-- layer alone can't fully close, since both are read/write helper
-- functions used by many policies across the schema.
--
-- Both changes are pure narrowing -- they can only remove rows/grants
-- these functions previously (incorrectly) allowed, never add new
-- access. That matters given 0022/0023: a *widening* RLS rewrite is what
-- broke production before. This does the opposite.

-- 1. project_members: fn_my_accessible_project_ids()/fn_my_admin_
-- project_ids() union in any project_members row for the caller, with
-- no check that the row's own project actually belongs to the caller's
-- workspace. A project_members row for a person outside that project's
-- workspace shouldn't exist after the app-layer fix, but the function
-- now refuses to honor one even if it does (a stale row, a direct SQL
-- edit, anything the app-layer check doesn't cover).
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
  join projects proj on proj.id = pm.project_id
  where me.auth_user_id = auth.uid()
    and proj.workspace_id = me.workspace_id;
$$;

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
  join projects proj on proj.id = pm.project_id
  where me.auth_user_id = auth.uid()
    and proj.workspace_id = me.workspace_id
    and pm.role = 'project_admin';
$$;

-- 2. space_roles: the write policies only checked "is the caller *a*
-- workspace_admin" (fn_is_workspace_admin(), which doesn't take a
-- workspace argument), never that the target person_id belongs to the
-- caller's own workspace -- a workspace A admin could grant/revoke
-- Product access for a person in workspace B.
drop policy if exists space_roles_write on space_roles;
create policy space_roles_write on space_roles for insert
  with check (
    fn_is_workspace_admin()
    and person_id in (select id from people where workspace_id in (select fn_my_internal_workspace_ids()))
  );

drop policy if exists space_roles_update on space_roles;
create policy space_roles_update on space_roles for update
  using (
    fn_is_workspace_admin()
    and person_id in (select id from people where workspace_id in (select fn_my_internal_workspace_ids()))
  );

drop policy if exists space_roles_delete on space_roles;
create policy space_roles_delete on space_roles for delete
  using (
    fn_is_workspace_admin()
    and person_id in (select id from people where workspace_id in (select fn_my_internal_workspace_ids()))
  );
