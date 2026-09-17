-- The "Share the client portal — always live" card on Client view config
-- (a read-only /portal/[ref] URL + Copy Link button) is not something
-- every workspace wants surfaced yet. Gate it behind a workspace-level
-- setting, off by default, managed from Settings > Client Management ->
-- Client portal, alongside the existing default_share_expiry_days /
-- portal_welcome_message fields on the same table.

begin;

alter table workspaces
  add column if not exists share_portal_link_enabled boolean not null default false;

commit;
