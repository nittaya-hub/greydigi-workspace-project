-- Removes the duplicate/mockup client confirmed by diagnose_nk_duplicate_
-- client.sql's own results: "Nutrition KITCHEN" (id
-- 01ec5d5a-2e59-4947-859c-8ca68f725509), with its own stray project ref
-- PHASE1 and one service -- distinct from the real client "Nutrition
-- Kitchen" (id 0bc08af2-1e54-4794-8546-999a3bf029df, project NK-P1),
-- which this script never touches.
--
-- BEFORE YOU RUN THIS: take a backup (Supabase dashboard -> Database ->
-- Backups). This is a real, irreversible DELETE against your live
-- project.
--
-- Only two tables need an explicit delete first: services and projects
-- both reference clients with ON DELETE RESTRICT, so Postgres refuses to
-- delete the client while either still points at it. Every other table
-- that hangs off a service, a project, or the client itself (incidents,
-- support_requests, service_agreements, entitlement_periods, run_books,
-- scheduled_health_checks, service_changes, improvement_items,
-- project_phases, project_gates, project_tasks, client_actions,
-- client_signatures, documents, client_roles, client_submissions,
-- hypercare_view_configs, hypercare_share_reports, and the rest) cascades
-- automatically -- verified against every "references services"/
-- "references projects"/"references clients" foreign key across
-- supabase/migrations/*.sql before writing this.
--
-- Wrapped in one transaction so a failure (e.g. an unexpected foreign
-- key this check missed) rolls back cleanly instead of leaving a
-- half-deleted client.

begin;

delete from services where client_id = '01ec5d5a-2e59-4947-859c-8ca68f725509';
delete from projects where client_id = '01ec5d5a-2e59-4947-859c-8ca68f725509';
delete from clients where id = '01ec5d5a-2e59-4947-859c-8ca68f725509';

commit;
