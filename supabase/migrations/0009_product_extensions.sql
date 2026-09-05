-- Product space additions found while building the roadmap/feature/release
-- screens: a feature needs prose, and release readiness must be derived
-- the same way gate completion is (design source, screen "Release detail":
-- "Readiness is met criteria over required criteria. Same rule as gate
-- completion in delivery") rather than a hand-typed percentage.

alter table roadmap_items add column description text;

create table release_criteria (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases (id) on delete cascade,
  description text not null,
  status condition_status not null default 'open',
  met_at timestamptz,
  sequence int not null
);

create index release_criteria_release_idx on release_criteria (release_id);

alter table release_criteria enable row level security;

create policy release_criteria_internal on release_criteria for all
  using (release_id in (
    select r.id from releases r
    join products p on p.id = r.product_id
    where p.workspace_id in (select fn_my_internal_workspace_ids())
  ));

create or replace function fn_release_readiness_pct(p_release_id uuid)
returns int
language sql
stable
as $$
  select case when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where status <> 'open') / count(*))
  end::int
  from release_criteria
  where release_id = p_release_id;
$$;

create or replace function trg_releases_readiness_recompute()
returns trigger
language plpgsql
as $$
declare
  v_release_id uuid;
begin
  v_release_id := coalesce(new.release_id, old.release_id);
  update releases set readiness_pct = fn_release_readiness_pct(v_release_id) where id = v_release_id;
  return null;
end;
$$;

create trigger release_criteria_readiness_recompute
after insert or update or delete on release_criteria
for each row execute function trg_releases_readiness_recompute();
