-- Block-based, grid-layout client dashboards, replacing the fixed on/off
-- toggle list (client_view_configs.fields) with a WordPress-style bounded
-- block library: text, image, the flight-plan spine, a document list, an
-- embed link, a metric (fixed dropdown of pre-built calculations, never a
-- user-typed formula), and a chart (fixed dropdown of pre-built series,
-- never a free query). Spans all three client-facing spaces:
--   - delivery: one dashboard per project (project_id)
--   - hypercare: one dashboard per client (client_id) -- new client-facing
--     read path; services/incidents/sla_policies have only _internal RLS
--     today, so this is a new security-definer boundary, not a new grant
--     on those tables.
--   - product: exactly one workspace-wide dashboard (no scope id) --
--     product has no client_id by design (see src/lib/data/shell.ts's own
--     comment: "a client filter there would be fabricated, not real
--     scoping"), so its blocks are limited to the existing
--     roadmap_items.client_visible + status='done' mechanism already used
--     by fn_client_portal_project's 'roadmap' key. No new client-linkage
--     schema for product.
--
-- A dedicated table, not a new key crammed into client_view_configs.fields:
-- that jsonb is read-modify-written as a whole blob today
-- (client-view-config/actions.ts::toggleClientViewField), which is fine for
-- five independent booleans but dangerous for structured per-block
-- position data -- moving or resizing one block should be a targeted row
-- update, not a whole-blob rewrite that could clobber a concurrent edit.
create type dashboard_space as enum ('delivery', 'hypercare', 'product');
create type dashboard_block_type as enum ('text', 'image', 'flight_plan', 'documents', 'embed', 'metric', 'chart');

create table client_dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  space dashboard_space not null,
  project_id uuid references projects (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  published_at timestamptz,
  published_by uuid references people (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint client_dashboards_scope_chk check (
    (space = 'delivery' and project_id is not null and client_id is null) or
    (space = 'hypercare' and client_id is not null and project_id is null) or
    (space = 'product' and project_id is null and client_id is null)
  )
);

-- One dashboard per project for delivery, per client for hypercare, and
-- exactly one ever for product (the partial index has no column to key
-- on, so it just caps the whole space at one row).
create unique index client_dashboards_delivery_uq on client_dashboards (project_id) where space = 'delivery';
create unique index client_dashboards_hypercare_uq on client_dashboards (client_id) where space = 'hypercare';
create unique index client_dashboards_product_uq on client_dashboards (space) where space = 'product';

create table dashboard_blocks (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references client_dashboards (id) on delete cascade,
  block_type dashboard_block_type not null,
  config jsonb not null default '{}'::jsonb,
  grid_x int not null default 0,
  grid_y int not null default 0,
  grid_w int not null default 4,
  grid_h int not null default 3,
  created_at timestamptz not null default now()
);

create index dashboard_blocks_dashboard_idx on dashboard_blocks (dashboard_id);

alter table client_dashboards enable row level security;
alter table dashboard_blocks enable row level security;

-- Internal-only RLS, matching the live 0007 shape (not the 0022 per-role
-- rewrite rolled back in 0023). No client-role policy on either table --
-- clients read blocks exclusively through the security-definer RPCs
-- below, the same boundary project_phases/project_gates/services/
-- incidents already use.
create policy client_dashboards_internal on client_dashboards for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

create policy dashboard_blocks_internal on dashboard_blocks for all
  using (dashboard_id in (select id from client_dashboards where workspace_id in (select fn_my_internal_workspace_ids())));

-- Shared block-shaping helper: every RPC below returns the same
-- 'blocks' shape, so this is factored out once rather than repeated in
-- three jsonb_agg calls that could quietly drift apart.
create or replace function fn_dashboard_blocks_json(p_dashboard_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'block_type', b.block_type,
    'config', b.config,
    'grid_x', b.grid_x,
    'grid_y', b.grid_y,
    'grid_w', b.grid_w,
    'grid_h', b.grid_h
  ) order by b.grid_y, b.grid_x), '[]'::jsonb)
  from dashboard_blocks b
  where b.dashboard_id = p_dashboard_id;
$$;

-- Delivery: reuses the project's own phases/gates/documents/roadmap --
-- the same raw data fn_client_portal_project already surfaces -- plus
-- the dashboard's blocks and a fixed set of precomputed metrics/chart
-- series for the metric/chart block types to read from. Kept separate
-- from fn_client_portal_project (not merged into it) so /portal/[ref]'s
-- existing legacy view keeps working unchanged for any project with no
-- published dashboard.
create or replace function fn_client_dashboard_delivery(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_project record;
  v_dashboard record;
  v_authorized boolean;
begin
  select p.*, c.name as client_name into v_project
  from projects p join clients c on c.id = p.client_id
  where p.id = p_project_id;
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  v_authorized := (
    v_project.workspace_id in (select fn_my_internal_workspace_ids())
    or v_project.client_id in (select fn_my_client_ids())
  );
  if not v_authorized then
    return jsonb_build_object('state', 'not_found');
  end if;

  select * into v_dashboard from client_dashboards where project_id = p_project_id and space = 'delivery';
  if not found or v_dashboard.published_at is null then
    return jsonb_build_object('state', 'ok', 'published', false, 'blocks', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'state', 'ok',
    'published', true,
    'blocks', fn_dashboard_blocks_json(v_dashboard.id),
    'flight_plan', jsonb_build_object(
      'phases', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', ph.code, 'name', ph.name, 'index', ph.index,
          'started_at', ph.started_at, 'completed_at', ph.completed_at,
          'duration_label', ph.duration_label, 'show_duration_label', ph.show_duration_label
        ) order by ph.index), '[]'::jsonb)
        from project_phases ph where ph.project_id = p_project_id
      ),
      'gates', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'code', g.code, 'name', g.name, 'sequence', g.sequence,
          'status', g.status, 'target_date', g.target_date
        ) order by g.sequence), '[]'::jsonb)
        from project_gates g where g.project_id = p_project_id
      )
    ),
    'documents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', d.name, 'kind', d.kind, 'version', d.version, 'created_at', d.created_at
      ) order by d.created_at desc), '[]'::jsonb)
      from documents d where d.project_id = p_project_id and d.visibility = 'client_visible'
    ),
    'metrics', jsonb_build_object(
      'gates_cleared_pct', fn_project_progress_pct(p_project_id),
      'days_to_go_live', case when v_project.go_live_target is null then null
        else (v_project.go_live_target - current_date) end,
      'document_count', (select count(*) from documents where project_id = p_project_id and visibility = 'client_visible'),
      'open_actions_count', (select count(*) from client_actions where project_id = p_project_id and status in ('pending', 'in_progress'))
    ),
    'charts', jsonb_build_object(
      'gates_by_status', (
        select coalesce(jsonb_agg(jsonb_build_object('label', status, 'value', n)), '[]'::jsonb)
        from (
          select status, count(*) as n from project_gates where project_id = p_project_id group by status
        ) s
      )
    )
  );
end;
$$;

revoke all on function fn_client_dashboard_delivery(uuid) from public;
grant execute on function fn_client_dashboard_delivery(uuid) to authenticated;

-- Hypercare: new client-facing read path. services/incidents/sla_policies
-- carry only an _internal RLS policy today (0007_rls.sql) -- this
-- function is the client boundary, exactly like fn_client_portal_project
-- is for delivery, not a new grant on those tables.
create or replace function fn_client_dashboard_hypercare(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client record;
  v_dashboard record;
  v_authorized boolean;
begin
  select * into v_client from clients where id = p_client_id;
  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  v_authorized := (
    p_client_id in (select fn_my_client_ids())
    or v_client.workspace_id in (select fn_my_internal_workspace_ids())
  );
  if not v_authorized then
    return jsonb_build_object('state', 'not_found');
  end if;

  select * into v_dashboard from client_dashboards where client_id = p_client_id and space = 'hypercare';
  if not found or v_dashboard.published_at is null then
    return jsonb_build_object('state', 'ok', 'published', false, 'blocks', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'state', 'ok',
    'published', true,
    'blocks', fn_dashboard_blocks_json(v_dashboard.id),
    'metrics', jsonb_build_object(
      'open_incidents_count', (
        select count(*) from incidents i join services s on s.id = i.service_id
        where s.client_id = p_client_id and i.status <> 'resolved'
      ),
      'sla_health_pct', (
        select case when count(*) = 0 then 100
          else round(100.0 * count(*) filter (where fn_service_health(s.id) = 'healthy') / count(*))
        end::int
        from services s where s.client_id = p_client_id
      )
    ),
    'charts', jsonb_build_object(
      'incidents_by_severity', (
        select coalesce(jsonb_agg(jsonb_build_object('label', severity, 'value', n)), '[]'::jsonb)
        from (
          select i.severity, count(*) as n
          from incidents i join services s on s.id = i.service_id
          where s.client_id = p_client_id and i.status <> 'resolved'
          group by i.severity
        ) s
      )
    )
  );
end;
$$;

revoke all on function fn_client_dashboard_hypercare(uuid) from public;
grant execute on function fn_client_dashboard_hypercare(uuid) to authenticated;

-- Product: workspace-wide, no client_id parameter -- there is nothing to
-- scope by (see the header comment). Filtered to the same
-- client_visible + status='done' roadmap items fn_client_portal_project
-- already surfaces, so this never fabricates per-client product data.
create or replace function fn_client_dashboard_product()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_dashboard record;
begin
  select workspace_id into v_workspace_id from people where auth_user_id = auth.uid() and kind = 'internal';
  if v_workspace_id is null then
    -- A client-portal person has no workspace_id of their own; fall back
    -- to the single workspace their client_roles grant belongs to.
    select c.workspace_id into v_workspace_id
    from client_roles cr
    join people p on p.id = cr.person_id
    join clients c on c.id = cr.client_id
    where p.auth_user_id = auth.uid()
    limit 1;
  end if;

  if v_workspace_id is null then
    return jsonb_build_object('state', 'not_found');
  end if;

  select * into v_dashboard from client_dashboards where space = 'product' and workspace_id = v_workspace_id;
  if not found or v_dashboard.published_at is null then
    return jsonb_build_object('state', 'ok', 'published', false, 'blocks', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'state', 'ok',
    'published', true,
    'blocks', fn_dashboard_blocks_json(v_dashboard.id),
    'roadmap', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ref', ri.ref, 'title', ri.title, 'kind', ri.kind, 'quarter', ri.quarter
      ) order by ri.quarter nulls last, ri.ref), '[]'::jsonb)
      from roadmap_items ri
      where ri.client_visible = true and ri.status = 'done'
    ),
    'metrics', jsonb_build_object(
      'roadmap_shipped_count', (select count(*) from roadmap_items where client_visible = true and status = 'done')
    ),
    'charts', jsonb_build_object(
      'roadmap_by_quarter', (
        select coalesce(jsonb_agg(jsonb_build_object('label', coalesce(quarter, 'Unscheduled'), 'value', n)), '[]'::jsonb)
        from (
          select quarter, count(*) as n from roadmap_items
          where client_visible = true and status = 'done'
          group by quarter
        ) s
      )
    )
  );
end;
$$;

revoke all on function fn_client_dashboard_product() from public;
grant execute on function fn_client_dashboard_product() to authenticated;
