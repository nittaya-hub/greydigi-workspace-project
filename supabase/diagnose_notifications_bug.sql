-- READ-ONLY diagnostic, safe to run. Checks why a fresh client
-- submission (from a no-login share link or the client portal) never
-- shows up in the internal team's notification bell.

-- 1) Does the fix from migration 0048 actually exist on this database?
-- If this returns 0 rows, that migration never landed here, which
-- fully explains "submission saved, but nothing on the bell" -- the
-- anonymous/public submit path has no other way to notify anyone.
select routine_name
from information_schema.routines
where routine_name in ('fn_public_submit_client_submission', 'fn_public_submit_hypercare_submission', 'fn_notify_workspace');

-- 2) The most recent client_submissions rows, real timestamps included
-- (confirms submissions are actually landing, and exactly when).
select id, kind, title, created_at, workspace_id, client_id
from client_submissions
order by created_at desc
limit 10;

-- 3) The most recent notifications of any kind, across the whole
-- workspace -- if query 2 shows fresh submissions but this comes back
-- empty (or with nothing from the same time), notifications genuinely
-- aren't being created for them.
select id, person_id, kind, title, created_at
from notifications
order by created_at desc
limit 15;

-- 4) Every internal person in the workspace that a submission's
-- notification fan-out should reach -- if this is empty or very short,
-- that's also worth knowing (no one to notify).
select id, full_name, kind, workspace_id
from people
where kind = 'internal';
