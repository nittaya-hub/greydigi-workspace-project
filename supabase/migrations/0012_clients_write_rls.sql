-- clients had only clients_read (0007_rls.sql) -- no insert/update/delete
-- policy at all, so the app's own "Add client" action (which correctly
-- uses the RLS-scoped client, not the admin client, since adding a client
-- isn't a privileged operation) could never actually insert a row.
-- Matches the "<table>_internal for all" shape already used for every
-- other internal-write table (products_internal, services_internal, etc).

create policy clients_internal on clients for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));
