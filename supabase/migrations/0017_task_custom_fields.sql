-- Configurable task columns: a lead can add a new column to the tasks
-- table at any time (e.g. "Reviewer", "Estimate") without a schema
-- change per field. One field definition per project, one text value per
-- (task, field) pair -- kept deliberately simple (free text only, no
-- typed/select fields yet) to match what was actually asked for.
create table task_custom_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index task_custom_fields_project_idx on task_custom_fields (project_id, sort_order);

create table task_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references project_tasks (id) on delete cascade,
  field_id uuid not null references task_custom_fields (id) on delete cascade,
  value text,
  updated_at timestamptz not null default now(),
  unique (task_id, field_id)
);

create index task_custom_field_values_task_idx on task_custom_field_values (task_id);

alter table task_custom_fields enable row level security;
alter table task_custom_field_values enable row level security;

create policy task_custom_fields_internal on task_custom_fields for all
  using (project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids())));

create policy task_custom_field_values_internal on task_custom_field_values for all
  using (
    field_id in (
      select id from task_custom_fields
      where project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids()))
    )
  );
