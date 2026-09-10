-- Real file storage for delivery documents. Until now, `documents` rows
-- were metadata-only -- `file_asset_id` was always left null and no
-- bytes ever reached Storage (see documents/actions.ts::createDocument
-- pre-fix). This gives delivery documents their own private bucket.
--
-- Path convention: <workspace_id>/<project_id>/<document_id>/<filename>.
-- Documents are internal-only today (documents_internal RLS on the table
-- itself, 0007_rls.sql) -- clients only ever learn about a document
-- through fn_client_portal_project's 'documents' block, never Storage
-- directly -- so this bucket needs a single workspace-scoped policy,
-- unlike client-attachments' two-segment (workspace_id, client_id)
-- scheme, which delivery documents have no natural second segment for.
insert into storage.buckets (id, name, public)
values ('delivery-documents', 'delivery-documents', false)
on conflict (id) do nothing;

create policy delivery_documents_internal_all on storage.objects for all
  using (
    bucket_id = 'delivery-documents'
    and (storage.foldername(name))[1]::uuid in (select fn_my_internal_workspace_ids())
  )
  with check (
    bucket_id = 'delivery-documents'
    and (storage.foldername(name))[1]::uuid in (select fn_my_internal_workspace_ids())
  );
