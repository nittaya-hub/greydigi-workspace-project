-- Task custom columns (0017) were free-text only. Adds a real type
-- system -- text (unchanged), calendar (a date, reuses the same
-- DatePicker every due-date field already uses), and status (a closed
-- set of colour-coded options, same "label + colour swatch, add/edit/
-- delete" shape already used for the Checkpoint Timeline's own status
-- palette, 0071). Type is chosen once at creation and is not editable
-- after -- switching an existing column's type would orphan whatever
-- values/options it already carries; delete and recreate is the
-- escape hatch, same as any other column.
--
-- Permission model matches every other task_custom_field* table
-- exactly (task_custom_fields_internal, 0023): workspace-wide, not
-- project-lead-gated -- this whole feature has always worked that way,
-- so a new sibling table getting a stricter gate would be an
-- inconsistency nobody asked for, not a fix.

begin;

alter table task_custom_fields
  add column if not exists field_type text not null default 'text'
    check (field_type in ('text', 'calendar', 'status'));

create table if not exists task_custom_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references task_custom_fields(id) on delete cascade,
  label text not null,
  color_hex text not null default '#8C9092',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table task_custom_field_values
  add column if not exists option_id uuid references task_custom_field_options(id) on delete set null;

create index if not exists idx_task_custom_field_options_field on task_custom_field_options(field_id);

alter table task_custom_field_options enable row level security;

drop policy if exists task_custom_field_options_internal on task_custom_field_options;
create policy task_custom_field_options_internal on task_custom_field_options for all
  using (
    field_id in (
      select id from task_custom_fields
      where project_id in (select id from projects where workspace_id in (select fn_my_internal_workspace_ids()))
    )
  );

commit;
