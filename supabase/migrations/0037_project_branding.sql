-- Per-project portal customization — logo, one accent color, and a
-- welcome headline. Deliberately small: earlier drafts of this feature
-- considered a full drag/drop block dashboard and a zip-uploaded
-- design-tokens package (mirroring workspace_branding), but that proved
-- too complex to actually use day to day. This keeps the exact same
-- "toggle sections + live preview" page (client-view-config) as the only
-- interface, adding just three fields to it. Unset, a project renders
-- with greydigi's own default look — nothing here ever changes the
-- app's own default CSS, only an explicit per-project override applied
-- inline on the portal page's own root element (see ClientPortalView.tsx).
create table project_branding (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  logo_data_url text,
  logo_filename text,
  accent_color text,
  welcome_headline text,
  updated_at timestamptz not null default now(),
  updated_by uuid references people (id) on delete set null
);

alter table project_branding enable row level security;

create policy project_branding_internal on project_branding for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

-- The real portal page (src/app/portal/[ref]/page.tsx) reads this
-- directly under the client's own RLS-scoped session, not through
-- fn_client_portal_project's jsonb payload -- simplest for something
-- this static, so a client viewing their own project needs a read grant.
create policy project_branding_client_read on project_branding for select
  using (project_id in (select id from projects where client_id in (select fn_my_client_ids())));
