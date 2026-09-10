-- Case tracking on client submissions (Hypercare > Client submissions):
-- assign an internal person to a submission, an internal reply thread on
-- it, and a "needs to notify client" flag -- confirmed scope, no real
-- outbound email/SMS. Mirrors the existing project_tasks patterns:
-- assignee_person_id is a plain nullable FK (same shape as
-- project_tasks.assignee_person_id), client_submission_comments mirrors
-- task_comments column-for-column, and needs_client_notice is a plain
-- boolean someone flips on/off from the submission detail view -- it is
-- only ever a reminder inside this app, never a trigger for an actual
-- client-facing message.
alter table client_submissions add column assignee_person_id uuid references people (id) on delete set null;
alter table client_submissions add column needs_client_notice boolean not null default false;
create index client_submissions_assignee_idx on client_submissions (assignee_person_id);

create table client_submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references client_submissions (id) on delete cascade,
  author_person_id uuid references people (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index client_submission_comments_submission_idx on client_submission_comments (submission_id, created_at);

-- Internal-only, matching client_submissions_internal -- this thread is
-- the team discussing the case with each other, never shown to the
-- client (unlike client_submissions itself, which the submitting client
-- can also read its own rows of).
alter table client_submission_comments enable row level security;
create policy client_submission_comments_internal on client_submission_comments for all
  using (submission_id in (select id from client_submissions where workspace_id in (select fn_my_internal_workspace_ids())))
  with check (submission_id in (select id from client_submissions where workspace_id in (select fn_my_internal_workspace_ids())));
