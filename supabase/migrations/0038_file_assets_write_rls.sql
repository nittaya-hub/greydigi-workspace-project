-- file_assets had a read policy (file_assets_read, 0007_rls.sql) but no
-- write policy at all -- fine while nothing ever inserted into it, but
-- Phase A's real document-upload wiring (documents/actions.ts::
-- attachDocumentFile) now does, and hits "new row violates row-level
-- security policy for table file_assets" without this.
create policy file_assets_write on file_assets for insert
  with check (workspace_id in (select fn_my_internal_workspace_ids()));
