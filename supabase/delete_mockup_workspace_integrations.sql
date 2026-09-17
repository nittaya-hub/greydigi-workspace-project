-- Removes the placeholder rows seeded into workspace_integrations by
-- migration 0010_settings.sql: ('Shopify'), ('Xero'), ('Google
-- Workspace'), one row per workspace, inserted automatically with no
-- basis in any real client's confirmed integration state -- generic
-- guessed names, per Settings > Integrations' own review, confirmed
-- as mockup data.
--
-- Settings > Integrations itself is unaffected -- it now also has a
-- real "Add a system this client actually uses" form (see
-- src/app/(app)/settings/integrations/page.tsx), so the page is ready
-- to take real rows by hand once there's a real one to track.
--
-- Nothing else references this table (no foreign keys point at
-- workspace_integrations), so this delete can't cascade into or break
-- anything else. Still, take a backup first if you'd rather be safe
-- (Supabase dashboard -> Database -> Backups) -- this is a real
-- DELETE against your live project.

begin;

delete from workspace_integrations;

commit;
