-- READ-ONLY, safe to run. Just the one query -- paste ONLY this into
-- the SQL editor and run it by itself, so there's no ambiguity about
-- which result is showing.
select id, full_name, kind, workspace_id, auth_user_id, created_at
from people
where full_name ilike 'nittaya%';
