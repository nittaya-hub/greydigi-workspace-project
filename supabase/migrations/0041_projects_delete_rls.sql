-- projects has had insert + update policies since 0007_rls.sql but no
-- delete policy, ever -- fine while nothing in the app tried to delete a
-- project, but a workspace admin now needs to be able to clean up a
-- project created by mistake (e.g. during testing), so this adds the
-- missing operation. Deliberately admin-only, unlike the broader
-- projects_internal_write/_update policies any internal member can use --
-- deleting a project cascades every phase/gate/task/document/baseline/
-- change-request/client-update/share-link/member/dashboard/branding row
-- under it (all declared `on delete cascade` against projects.id since
-- 0003_delivery.sql), so this is the one project-level write that should
-- not be casual.
create policy projects_internal_delete on projects for delete
  using (workspace_id in (select fn_my_internal_workspace_ids()) and fn_is_workspace_admin());
