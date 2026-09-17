-- READ-ONLY, safe to run. Paste this single query into the SQL editor
-- and run it by itself.
--
-- Investigating: the client switcher shows two rows for the same client
-- -- "Nutrition Kitchen" and "Nutrition KITCHEN" -- reported from a
-- screenshot of the live app. clients.name has no unique constraint (not
-- even case-insensitive), so two differently-cased rows can coexist.
-- This lists every client whose name matches "Nutrition Kitchen" in any
-- casing, with how many real rows hang off each one, so the mockup
-- duplicate can be told apart from the real NK-P1 client with certainty
-- before anything is deleted -- do not delete based on name/casing
-- alone.
select
  c.id,
  c.name,
  c.client_since,
  c.hypercare_enabled,
  (select count(*) from projects p where p.client_id = c.id) as project_count,
  (select string_agg(p.ref, ', ') from projects p where p.client_id = c.id) as project_refs,
  (select count(*) from services s where s.client_id = c.id) as service_count,
  (select count(*) from client_roles cr where cr.client_id = c.id) as client_role_count,
  (select count(*) from client_actions ca join projects p on p.id = ca.project_id where p.client_id = c.id) as client_action_count
from clients c
where c.name ilike 'nutrition kitchen'
order by c.client_since nulls last;
