-- Workspace-level settings surfaced on /settings: business hours (used by
-- SLA clocks), default share-link expiry, and a portal welcome message —
-- previously hardcoded strings in the page instead of real columns.
--
-- Also fixes a real gap: workspaces had a read policy (0007_rls.sql) but
-- no write policy at all, so the existing "Save" button on /settings could
-- never actually persist a rename under RLS.

alter table workspaces
  add column business_hours text not null default 'Mon to Fri, 09:00 to 18:00',
  add column default_share_expiry_days int not null default 30,
  add column portal_welcome_message text;

create or replace function fn_my_admin_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from people
  where auth_user_id = auth.uid() and workspace_role = 'workspace_admin';
$$;

create policy workspaces_admin_write on workspaces for update
  using (id in (select fn_my_admin_workspace_ids()))
  with check (id in (select fn_my_admin_workspace_ids()));

-- Integrations: lightweight connection-status rows per workspace. No real
-- OAuth flow here (out of scope for this app) -- "connected" just means an
-- internal member has flagged the integration as wired up, same honesty
-- rule as everywhere else in this schema: a real row, not a fake toggle.
create type integration_status as enum ('not_connected', 'connected');

create table workspace_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  status integration_status not null default 'not_connected',
  connected_at timestamptz,
  unique (workspace_id, name)
);

alter table workspace_integrations enable row level security;

create policy workspace_integrations_internal on workspace_integrations for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

insert into workspace_integrations (workspace_id, name)
select w.id, i.name
from workspaces w
cross join (values ('Shopify'), ('Xero'), ('Google Workspace')) as i(name)
on conflict (workspace_id, name) do nothing;
