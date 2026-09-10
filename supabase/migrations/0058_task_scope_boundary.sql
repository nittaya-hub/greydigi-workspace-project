-- Scope-boundary enforcement: work outside the project's approved
-- Phase-1 scope must be blocked until it's linked to an approved
-- Change Request -- a real, DB-level workflow ("บังคับเป็น workflow
-- จริง"), not a UI-only hint. ChangeRequestsTable.tsx and
-- BaselinesTable.tsx already carry this as copy ("Scope moves only
-- through a change request") with nothing backing it; this migration
-- is what makes that sentence actually true.
--
-- Mechanism: a task can be flagged is_out_of_scope. A BEFORE INSERT OR
-- UPDATE trigger on project_tasks refuses to write any row with
-- is_out_of_scope = true unless change_request_id points at a change
-- request that (a) belongs to the same project and (b) has
-- status = 'approved'. This runs on every write path to project_tasks
-- -- createTaskInline, updateTaskField, a future bulk import, or a
-- direct API/SQL call -- not just the one server action that happens to
-- expose the toggle in the UI today.
alter table project_tasks add column is_out_of_scope boolean not null default false;
alter table project_tasks add column change_request_id uuid references change_requests (id) on delete set null;
create index project_tasks_change_request_idx on project_tasks (change_request_id);

create or replace function fn_enforce_task_scope_boundary()
returns trigger
language plpgsql
as $$
declare
  v_cr_status change_request_status;
  v_cr_project_id uuid;
begin
  if new.is_out_of_scope then
    if new.change_request_id is null then
      raise exception 'Out-of-scope work must be linked to a change request before it can be saved.';
    end if;

    select project_id, status into v_cr_project_id, v_cr_status
    from change_requests
    where id = new.change_request_id;

    if v_cr_project_id is null then
      raise exception 'Linked change request not found.';
    end if;
    if v_cr_project_id <> new.project_id then
      raise exception 'Linked change request belongs to a different project.';
    end if;
    if v_cr_status <> 'approved' then
      raise exception 'Out-of-scope work can only proceed once its change request is approved (currently %).', v_cr_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_task_scope_boundary
before insert or update on project_tasks
for each row execute function fn_enforce_task_scope_boundary();
