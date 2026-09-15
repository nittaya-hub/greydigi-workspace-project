-- aironauts Decision Pack, "The three handoffs that make it one system":
-- "A market product sold to a client opens a mission, carrying its
-- scope and delivery template." Two additive, nullable columns:
--
-- - products.delivery_template_version_id: the locked template version a
--   sale of this product instantiates as a mission. Null until someone
--   attaches one on the product's own page -- most products (especially
--   Platform-track ones, which are never sold) will never set this.
-- - projects.origin_product_id: which product a mission came from, when
--   it was created via that handoff rather than by hand. Mirrors
--   services.origin_project_id (0005_hypercare.sql), the one handoff
--   that already worked before this migration -- same "carry the link,
--   never retype it" pattern.
alter table products
  add column if not exists delivery_template_version_id uuid references template_versions (id) on delete set null;

alter table projects
  add column if not exists origin_product_id uuid references products (id) on delete set null;

create index if not exists projects_origin_product_idx on projects (origin_product_id) where origin_product_id is not null;
