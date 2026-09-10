-- Client submission taxonomies: the category/severity/priority option lists
-- shown on the client portal's "Report an issue" / "Change request" / "Ask
-- a question" forms (src/app/portal/[ref]/ClientSubmissionForm.tsx) were
-- hardcoded directly in that component, with no way for a workspace admin
-- to add, rename, reorder or retire an option without a code change. This
-- table makes those lists workspace-owned, editable data instead.
--
-- One row per (workspace, kind, field, value). `field` names which select
-- the option belongs to: 'category' and 'severity' apply to kind = 'issue',
-- 'priority' applies to kind = 'change_request'. 'question' has no extra
-- fields, so it never gets rows here. `is_active` lets an admin retire an
-- option (e.g. after a rename) without deleting history on submissions that
-- already used it.
create table submission_taxonomy_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  kind client_submission_kind not null,
  field text not null check (field in ('category', 'severity', 'priority')),
  value text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, kind, field, value)
);

create index submission_taxonomy_options_workspace_idx on submission_taxonomy_options (workspace_id);

alter table submission_taxonomy_options enable row level security;

-- Internal members: full access (this is what /settings/submissions writes
-- through). UI-level admin gating matches the existing pattern for
-- workspace_integrations / sla_policies (0010_settings.sql) -- RLS allows
-- any internal member, the settings page itself checks workspace_admin.
create policy submission_taxonomy_options_internal on submission_taxonomy_options for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

-- Client-portal users: read-only, and only active options, scoped to their
-- own client's workspace -- this is what ClientSubmissionForm reads to
-- populate its selects.
create policy submission_taxonomy_options_client_read on submission_taxonomy_options for select
  using (
    is_active
    and workspace_id in (select workspace_id from clients where id in (select fn_my_client_ids()))
  );

-- Seed the options that were previously hardcoded in ClientSubmissionForm,
-- for every existing workspace, so the form's behaviour doesn't change the
-- moment this migration runs -- an admin can now edit/retire/add from here.
insert into submission_taxonomy_options (workspace_id, kind, field, value, label, sort_order)
select w.id, 'issue', 'category', v.value, v.label, v.sort_order
from workspaces w
cross join (values
  ('data_sync', 'Data sync', 1),
  ('access', 'Access', 2),
  ('performance', 'Performance', 3),
  ('incorrect_output', 'Incorrect output', 4),
  ('other', 'Other', 5)
) as v(value, label, sort_order)
on conflict (workspace_id, kind, field, value) do nothing;

insert into submission_taxonomy_options (workspace_id, kind, field, value, label, sort_order)
select w.id, 'issue', 'severity', v.value, v.label, v.sort_order
from workspaces w
cross join (values
  ('sev1', 'Sev 1 -- blocking', 1),
  ('sev2', 'Sev 2 -- degraded', 2),
  ('sev3', 'Sev 3 -- minor / cosmetic', 3)
) as v(value, label, sort_order)
on conflict (workspace_id, kind, field, value) do nothing;

insert into submission_taxonomy_options (workspace_id, kind, field, value, label, sort_order)
select w.id, 'change_request', 'priority', v.value, v.label, v.sort_order
from workspaces w
cross join (values
  ('low', 'Low', 1),
  ('medium', 'Medium', 2),
  ('high', 'High', 3)
) as v(value, label, sort_order)
on conflict (workspace_id, kind, field, value) do nothing;
