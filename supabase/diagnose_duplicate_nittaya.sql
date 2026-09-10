-- READ-ONLY, safe to run. Confirms which of the two "Nittaya" person
-- rows your actual login session resolves to.

-- 1) The two person rows in full, including which auth user they're
-- each linked to.
select id, full_name, kind, workspace_id, auth_user_id, created_at
from people
where full_name ilike 'nittaya%';

-- 2) The matching auth.users row(s) -- confirms whether both person
-- rows point at the SAME login (one real account, two people rows --
-- a data bug) or at two different logins entirely (two real accounts).
select id, email, created_at
from auth.users
where id in (select auth_user_id from people where full_name ilike 'nittaya%');

-- 3) Is "00000000-0000-0000-0000-000000000000" a real row in
-- workspaces at all, or just a stray value that was never a real
-- workspace to begin with?
select id, name, created_at
from workspaces
where id = '00000000-0000-0000-0000-000000000000';
