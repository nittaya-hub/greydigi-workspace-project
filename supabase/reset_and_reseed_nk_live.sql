-- Reset the workspace to a clean slate before reseeding it with the real
-- Nutrition Kitchen (NK-P1) data, corrected against the signed contracts
-- (MSA + SOW-2026-001 + SOW-2026-002) and the Phase 1 kickoff deck.
--
-- WHAT THIS DOES
--   Deletes every client, project, product, service, team space and their
--   dependent rows -- including both the fictional demo portfolio
--   (supabase/seed.sql, client "Nutrition Kitchen" ref NK-M01) and any
--   prior copy of the real NK-P1 data -- so the workspace can be reseeded
--   from a known-clean state.
--
-- WHAT THIS KEEPS
--   - The `workspaces` row itself.
--   - `people` rows with workspace_role = 'workspace_admin', and their
--     matching auth.users accounts, so you can still sign in afterward.
--   - The locked `templates` / `template_versions` / `template_phases` /
--     `template_gates` / `template_gate_conditions` / `template_tasks`
--     rows (the aironauts Flight Plan v0.6 methodology) -- this is
--     reusable methodology, not client data, and any new project needs it.
--   - `workspace_branding` / `workspace_integrations` (workspace-level
--     config, not client data).
--
-- HOW TO RUN THIS
--   This project has no direct Postgres connection string available to
--   the assistant session that wrote this script, and no supabase CLI
--   project link either -- so it cannot be executed automatically. Open
--   your Supabase project's SQL Editor, paste this file, and run it
--   yourself, the same way the other files under supabase/migrations/ are
--   applied (see docs/GUIDE.en.md section 6).
--
-- BEFORE YOU RUN THIS: take a backup. In the Supabase dashboard, go to
-- Database -> Backups (or Table Editor -> export each table you care
-- about) and export first. This script is a real, irreversible DELETE
-- against your live project -- there is no undo once you commit.
--
-- After this runs successfully, run the corrected supabase/seed_nk_live.sql
-- next to repopulate the real NK-P1 engagement.

begin;

do $$
declare
  v_deleted_auth_ids uuid[];
begin

  -- Capture which auth.users accounts belong to non-admin people, so they
  -- can be removed too (client contacts, demo internal members) -- captured
  -- before the `people` rows themselves are deleted.
  select array_agg(auth_user_id) into v_deleted_auth_ids
  from people
  where workspace_role <> 'workspace_admin' and auth_user_id is not null;

  -- Deepest dependents first ---------------------------------------------
  delete from task_custom_field_values;
  delete from task_custom_fields;
  delete from task_comments;
  delete from project_tasks;
  delete from project_gate_conditions;
  delete from project_gates;
  delete from project_phases;
  delete from baselines;
  delete from change_requests;
  delete from client_signatures;
  delete from client_actions;
  delete from share_link_views;
  delete from share_links;
  delete from client_view_configs;
  delete from client_updates;
  delete from documents;
  delete from project_members;
  delete from release_criteria;
  delete from project_release_dependencies;
  delete from roadmap_items;
  delete from releases;
  delete from engineering_tasks;
  delete from products;
  delete from incident_pauses;
  delete from health_checks;
  delete from escalations;
  delete from support_requests;
  delete from incidents;
  delete from sla_policies;
  delete from services;
  delete from projects;
  delete from client_submission_attachments;
  delete from client_submissions;
  delete from client_roles;
  delete from clients;
  delete from cross_space_links;
  delete from file_assets;
  delete from activity_log;
  delete from notifications;
  delete from space_roles where person_id in (
    select id from people where workspace_role <> 'workspace_admin'
  );

  -- People last: keep workspace_admin only ---------------------------------
  delete from people where workspace_role <> 'workspace_admin';

  -- Finally, the auth accounts for everyone just removed above. This needs
  -- to run with a role that can write auth.users (the SQL Editor's default
  -- role can). If your project restricts this, delete these accounts from
  -- Authentication -> Users in the dashboard instead, using the same id list.
  if v_deleted_auth_ids is not null then
    delete from auth.users where id = any(v_deleted_auth_ids);
  end if;

end $$;

commit;

-- Next step: run the corrected supabase/seed_nk_live.sql to repopulate the
-- real NK-P1 engagement (workspace, people, client, template, project,
-- phases, gates, tasks, milestones, baseline) from the signed contracts.
