-- Backs the "User Access" table's active/inactive toggle (Settings ->
-- Permissions). A soft flag only for this pass — it does not yet gate
-- sign-in or any RLS policy (fn_my_internal_workspace_ids(),
-- fn_is_workspace_admin(), etc. don't check it), since wiring that in
-- touches RLS surface that has broken before this session and deserves
-- its own careful, staging-tested pass rather than riding along with a
-- UI change.
alter table people add column is_active boolean not null default true;
