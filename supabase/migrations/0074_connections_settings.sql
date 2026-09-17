-- Settings > Connections (super admin only): a real on/off switch per
-- agent connection, plus somewhere to actually test whether a
-- connection or the AI provider key works, instead of only ever
-- finding out inside the Agent registry's own Connect wizard.

begin;

alter table agent_connections
  add column if not exists enabled boolean not null default true;

commit;
