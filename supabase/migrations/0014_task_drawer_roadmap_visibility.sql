-- Task Drawer support: manual reorder within a phase group, an
-- internal/external visibility tag (distinct from client_visible_date,
-- which marks a milestone specifically), and a comment thread per task
-- (the drawer's "Activity" tab reads activity_log via fn_log_activity,
-- already wired for other entities -- see 0006_state_engine.sql -- so it
-- needs no new table; only comments, a human conversation thread, does).

create type task_visibility as enum ('internal', 'external');

alter table project_tasks
  add column sort_order integer not null default 0,
  add column visibility task_visibility not null default 'internal';

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references project_tasks (id) on delete cascade,
  author_person_id uuid references people (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_comments_task_idx on task_comments (task_id, created_at);

alter table task_comments enable row level security;

create policy task_comments_internal on task_comments for all
  using (
    task_id in (
      select pt.id from project_tasks pt
      join projects p on p.id = pt.project_id
      where p.workspace_id in (select fn_my_internal_workspace_ids())
    )
  );

-- Product -> client portal: an engineering/roadmap item is internal by
-- default; a lead flips this on to let it surface on the client's roadmap
-- view once the client-portal projection reads it (see spec section 4,
-- "Developer-to-Client Feature Visibility").
alter table roadmap_items add column client_visible boolean not null default false;
