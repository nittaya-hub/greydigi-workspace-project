-- Hypercare Cockpit Blueprint: the remaining objects of the 11-object
-- model (page 3). Service, Incident, Request, Escalation already existed
-- (0005_hypercare.sql). This adds the other five: Service agreement,
-- Entitlement period, Run book, Service change, Improvement item.
-- "Health check" (scheduled, run-book-linked) is added here too, as its
-- own table -- the blueprint's own words for today's health_checks were
-- "a different-shaped object" (a point-in-time status snapshot feeding
-- fn_service_health), so that table is left exactly as it is and this is
-- additive, not a replacement.
--
-- Written idempotently throughout (IF NOT EXISTS / guarded DO blocks) so
-- it's safe to re-run after a partial failure -- the first attempt broke
-- partway through because fn_entitlement_consumed originally referenced
-- service_changes/scheduled_health_checks before either table existed;
-- fixed here by defining every table first and the function last.

do $$ begin
  create type service_change_status as enum ('open', 'done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type improvement_item_status as enum ('open', 'done');
exception when duplicate_object then null;
end $$;

-- Term, fee, tier, SLA and entitlement -- meant to be inherited from the
-- signed SOW at Gate 5 (the DocuSign chain, not built yet: source_ref is
-- a plain text field for now, filled by hand, replaced by a real
-- docusign_envelope_id once that connector exists).
create table if not exists service_agreements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null unique references services (id) on delete cascade,
  tier text not null,
  term_months int,
  fee text,
  entitlement_included_units int not null default 0,
  renewal_date date,
  source_ref text,
  created_at timestamptz not null default now()
);

create index if not exists service_agreements_workspace_idx on service_agreements (workspace_id);

-- The monthly bucket. consumed_units is deliberately NOT a stored column
-- -- fn_entitlement_consumed (defined at the end of this file, once
-- every table it reads from exists) derives it from incidents/requests/
-- service_changes/scheduled_health_checks opened inside the period,
-- matching this schema's existing rule that derived state is computed,
-- never cached and drifted (fn_project_health, fn_service_health,
-- fn_recompute_project_gates all work the same way).
create table if not exists entitlement_periods (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  included_units int not null default 0,
  overage_billed boolean not null default false,
  overage_absorbed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (service_id, period_start)
);

create index if not exists entitlement_periods_workspace_idx on entitlement_periods (workspace_id);
create index if not exists entitlement_periods_service_idx on entitlement_periods (service_id);

-- What the workflow does, dependencies, recovery steps, owner,
-- escalation path -- one per service, authored from the mission's own
-- deployment documentation at go-live.
create table if not exists run_books (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null unique references services (id) on delete cascade,
  dependencies text,
  recovery_steps text,
  owner_person_id uuid references people (id) on delete set null,
  escalation_path text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists run_books_workspace_idx on run_books (workspace_id);

-- Scheduled proactive work against a run book -- the blueprint's actual
-- "Health check" object (distinct from the existing point-in-time
-- health_checks status snapshot).
create table if not exists scheduled_health_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  run_book_id uuid references run_books (id) on delete set null,
  performed_at timestamptz not null default now(),
  performed_by_person_id uuid references people (id) on delete set null,
  notes text,
  found_issue boolean not null default false
);

create index if not exists scheduled_health_checks_workspace_idx on scheduled_health_checks (workspace_id);
create index if not exists scheduled_health_checks_service_idx on scheduled_health_checks (service_id);

-- A change to the running solution, inside entitlement or billable --
-- the object the "escape valve" needed and didn't have: raised from an
-- incident or request under the effort threshold. Past the threshold,
-- decideChangeRequest / a new mission in Missions is the real escape
-- valve (already wired -- Hypercare -> Missions handoff).
create table if not exists service_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  title text not null,
  description text,
  effort_band text,
  billable boolean not null default false,
  status service_change_status not null default 'open',
  source_incident_id uuid references incidents (id) on delete set null,
  source_request_id uuid references support_requests (id) on delete set null,
  created_by_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists service_changes_workspace_idx on service_changes (workspace_id);
create index if not exists service_changes_service_idx on service_changes (service_id);

-- A recurring pattern worth fixing -- feeds Manifest's pattern library
-- and the Hangar roadmap directly (Manifest reads this table rather than
-- a copy of it, same "nothing retyped at a handoff" rule as everywhere
-- else -- see lib/data/manifest.ts).
create table if not exists improvement_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  pattern text not null,
  frequency int not null default 1,
  proposed_fix text,
  status improvement_item_status not null default 'open',
  created_by_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists improvement_items_workspace_idx on improvement_items (workspace_id);
create index if not exists improvement_items_service_idx on improvement_items (service_id);

-- Now that every referenced table exists, define the derivation function.
create or replace function fn_entitlement_consumed(p_entitlement_period_id uuid)
returns int
language sql
stable
as $$
  with period as (
    select service_id, period_start, period_end from entitlement_periods where id = p_entitlement_period_id
  )
  select
    (select count(*) from incidents i, period where i.service_id = period.service_id and i.opened_at::date between period.period_start and period.period_end)
    + (select count(*) from support_requests r, period where r.service_id = period.service_id and r.opened_at::date between period.period_start and period.period_end)
    + (select count(*) from service_changes c, period where c.service_id = period.service_id and c.created_at::date between period.period_start and period.period_end)
    + (select count(*) from scheduled_health_checks h, period where h.service_id = period.service_id and h.performed_at::date between period.period_start and period.period_end);
$$;

alter table service_agreements enable row level security;
alter table entitlement_periods enable row level security;
alter table run_books enable row level security;
alter table scheduled_health_checks enable row level security;
alter table service_changes enable row level security;
alter table improvement_items enable row level security;

drop policy if exists service_agreements_internal on service_agreements;
create policy service_agreements_internal on service_agreements for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists entitlement_periods_internal on entitlement_periods;
create policy entitlement_periods_internal on entitlement_periods for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists run_books_internal on run_books;
create policy run_books_internal on run_books for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists scheduled_health_checks_internal on scheduled_health_checks;
create policy scheduled_health_checks_internal on scheduled_health_checks for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists service_changes_internal on service_changes;
create policy service_changes_internal on service_changes for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

drop policy if exists improvement_items_internal on improvement_items;
create policy improvement_items_internal on improvement_items for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));

-- Decision #8: the required connector set is Attio, DocuSign, n8n, MCP
-- and Google Workspace (Decision Pack, decision 8) -- Shopify/Xero were
-- never part of that list and are removed rather than left alongside it.
delete from workspace_integrations where name in ('Shopify', 'Xero');
insert into workspace_integrations (workspace_id, name)
select w.id, i.name
from workspaces w
cross join (values ('Attio'), ('DocuSign'), ('n8n'), ('MCP'), ('Google Workspace')) as i(name)
on conflict (workspace_id, name) do nothing;
