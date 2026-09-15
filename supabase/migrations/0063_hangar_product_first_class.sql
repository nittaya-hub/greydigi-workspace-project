-- Decision #4 ("Product as a first-class object"): Decision Pack, page 6,
-- "Two development tracks, two sets of gates" -- Platform (no external
-- customer, no launch date, gated on adoption/reuse) vs Market (what we
-- take to clients, gated G1-G5). Additive/nullable throughout: existing
-- products keep working unclassified until someone sets a track.

create type product_track as enum ('platform', 'market');
create type product_stage_gate as enum ('G1', 'G2', 'G3', 'G4', 'G5');

alter table products add column track product_track;
-- G1 Business case approved: problem, buyer, price, size.
alter table products add column business_case_problem text;
alter table products add column business_case_buyer text;
alter table products add column business_case_price text;
alter table products add column business_case_size text;
-- G2 Build committed: scope, team, date, kill criteria -- team/date
-- already exist as concepts elsewhere (releases.target_date, engineering
-- assignment); scope/kill criteria are new, product-level.
alter table products add column build_scope text;
alter table products add column kill_criteria text;
-- G3 Design partner proven: one real client, measured outcome.
alter table products add column design_partner_project_id uuid references projects (id) on delete set null;
alter table products add column design_partner_outcome text;
-- G4 Launch ready: pricing, collateral, delivery template (delivery
-- template is products.delivery_template_version_id, 0061), support model.
alter table products add column pricing text;
alter table products add column collateral_url text;
alter table products add column support_model text;
-- The current stage a Market-track product has reached. Null for
-- Platform-track products (they aren't gated this way) and for any
-- product not yet classified.
alter table products add column stage_gate product_stage_gate;

-- History of stage advances -- this IS the Hangar half of "no gate
-- closes without a write-back" (Decision Pack, page 7): every time a
-- product's stage_gate moves forward, a row lands here permanently, the
-- same "append-only, never edited" shape as project_checkpoint_snapshots
-- and manifest_calibration. Manifest's overview reads this directly
-- (lib/data/manifest.ts) rather than duplicating it into manifest_*
-- tables -- one source of truth, nothing retyped at the handoff.
create table product_gate_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  stage_gate product_stage_gate not null,
  reached_at timestamptz not null default now(),
  reached_by_person_id uuid references people (id) on delete set null,
  unique (product_id, stage_gate)
);

create index product_gate_history_workspace_idx on product_gate_history (workspace_id);
create index product_gate_history_product_idx on product_gate_history (product_id);

alter table product_gate_history enable row level security;

create policy product_gate_history_internal on product_gate_history for all
  using (workspace_id in (select fn_my_internal_workspace_ids()));
