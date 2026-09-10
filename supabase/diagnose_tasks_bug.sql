-- READ-ONLY diagnostic, safe to run — three separate SELECTs, no writes.
-- Run each one (or all three) in the Supabase SQL editor and read back
-- the results here in chat; that will tell us exactly which of the
-- three suspects behind "sidebar says 14 tasks, Tasks tab shows 0" is
-- the real one, instead of guessing further from code alone.

-- 1) Does the column my code added in migration 0058 actually exist on
--    project_tasks? If this returns zero rows, 0058 did not land on
--    this database (whatever ran, this specific ALTER TABLE didn't).
select column_name, data_type
from information_schema.columns
where table_name = 'project_tasks' and column_name in ('is_out_of_scope', 'change_request_id');

-- 2) The project's real id and its real, unfiltered task count,
--    straight from the table (bypasses every RLS policy since this
--    runs as you in the SQL editor, which uses the postgres role).
select p.id as project_id, p.ref, p.name, count(t.id) as real_task_count
from projects p
join clients c on c.id = p.client_id
left join project_tasks t on t.project_id = p.id
where trim(lower(c.name)) = 'nutrition kitchen'
group by p.id, p.ref, p.name;

-- 3) The exact same SELECT the internal Tasks page runs (getProjectTasks
--    in src/lib/data/project.ts) — paste the project_id from query 2
--    above in place of <PROJECT_ID>. If query 1 came back empty, this
--    one will fail outright with "column does not exist" — that error
--    message is the confirmation.
-- select id, ref, title, status, is_critical_path, client_visible_date, due_date,
--        assignee_person_id, project_phase_id, sort_order, visibility, created_at, is_out_of_scope
-- from project_tasks
-- where project_id = '<PROJECT_ID>'
-- order by sort_order, created_at
-- limit 5;
