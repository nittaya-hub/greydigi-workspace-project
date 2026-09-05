-- notifications had read-own and update-own policies (0007_rls.sql) but no
-- insert policy at all, so nothing in the app could ever create one under
-- RLS (only elevated seed/admin scripts could). Every mutation now broadcasts
-- a notification via fn_my_internal_workspace_ids()-scoped src/lib/data/notify.ts,
-- which needs to insert a row for teammates, not just the acting user.

create policy notifications_insert_internal on notifications for insert
  with check (
    workspace_id in (select fn_my_internal_workspace_ids())
    and person_id in (select id from people where workspace_id in (select fn_my_internal_workspace_ids()))
  );
