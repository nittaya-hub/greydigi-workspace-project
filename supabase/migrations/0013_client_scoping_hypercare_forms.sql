-- 1. Per-client HyperCare gate: an admin toggle for clients who haven't
--    purchased HyperCare. Nav/routes check this, not just "does a service
--    exist" (a client can be mid-onboarding with no service yet but still
--    have HyperCare enabled).
alter table clients add column hypercare_enabled boolean not null default true;

-- 2. Client-facing HyperCare intake forms: Report an issue, Change
-- request, Ask a question. Distinct from the internal-only `incidents` /
-- `change_requests` tables (those are logged and driven by the internal
-- team; these are what a client submits from the portal, before internal
-- triage turns some of them into a real incident/CR). One shared shape
-- because all three forms are "client writes something, attaches files,
-- internal team gets notified and works it" -- kind is what varies.
create type client_submission_kind as enum ('issue', 'change_request', 'question');
create type client_submission_status as enum ('open', 'in_progress', 'resolved');

create table client_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  kind client_submission_kind not null,
  category text,
  severity text,
  priority text,
  title text not null,
  description text not null,
  business_impact text,
  status client_submission_status not null default 'open',
  submitted_by uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index client_submissions_workspace_idx on client_submissions (workspace_id);
create index client_submissions_client_idx on client_submissions (client_id);

create table client_submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references client_submissions (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  content_type text,
  created_at timestamptz not null default now()
);

create index client_submission_attachments_submission_idx on client_submission_attachments (submission_id);

alter table client_submissions enable row level security;
alter table client_submission_attachments enable row level security;

-- Internal members: full access within their workspace (triage, respond,
-- resolve). Client-portal users: full access to their own client's rows
-- only (submit, read their own history) -- mirrors the clients_read /
-- fn_my_client_ids() shape already used for the portal boundary.
create policy client_submissions_internal on client_submissions for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy client_submissions_client on client_submissions for all
  using (client_id in (select fn_my_client_ids()))
  with check (client_id in (select fn_my_client_ids()));

create policy client_submission_attachments_internal on client_submission_attachments for all
  using (
    submission_id in (
      select id from client_submissions where workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

create policy client_submission_attachments_client on client_submission_attachments for all
  using (submission_id in (select id from client_submissions where client_id in (select fn_my_client_ids())))
  with check (submission_id in (select id from client_submissions where client_id in (select fn_my_client_ids())));

-- 3. Storage bucket for the attachments above (and any future upload
-- flow) -- private bucket, access goes entirely through signed URLs /
-- the RLS policies below, never a public path.
insert into storage.buckets (id, name, public)
values ('client-attachments', 'client-attachments', false)
on conflict (id) do nothing;

-- Storage RLS: object path convention is
-- `<workspace_id>/<client_id>/<submission_id>/<filename>`. Internal
-- members can read/write anything under their workspace's prefix; client
-- users can read/write anything under their own client's prefix. Both
-- checks parse the path with storage.foldername (returns a text[] of the
-- path segments), matching the convention Supabase's own docs use.
create policy client_attachments_internal_all on storage.objects for all
  using (
    bucket_id = 'client-attachments'
    and (storage.foldername(name))[1]::uuid in (select fn_my_internal_workspace_ids())
  );

create policy client_attachments_client_all on storage.objects for all
  using (
    bucket_id = 'client-attachments'
    and (storage.foldername(name))[2]::uuid in (select fn_my_client_ids())
  )
  with check (
    bucket_id = 'client-attachments'
    and (storage.foldername(name))[2]::uuid in (select fn_my_client_ids())
  );
