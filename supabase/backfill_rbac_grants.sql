-- One-time backfill: populates project_members and space_roles for the
-- real Nutrition Kitchen team (per supabase/seed_nk_live.sql) so that
-- 0022_project_scoped_rls_rewrite.sql can be re-applied safely later
-- without repeating the incident it caused on the first try (every
-- non-workspace_admin losing access because these tables were empty).
--
-- Safe to re-run: every insert is a find-or-create by email/ref, and
-- project_members/space_roles both have a unique constraint the ON
-- CONFLICT clause relies on. Nittaya (workspace_admin) needs no row —
-- fn_is_workspace_admin() already gives her unrestricted access.
--
-- Review the role assignments below before running — they're a
-- reasonable default based on the seed data (Orhan is the project's
-- lead_person_id, so project_admin; Manh/Jun/Chris are plain team
-- members), not a business decision only you can confirm. Adjust the
-- values, or skip this and use the Members tab / People page UI instead
-- (src/app/(app)/delivery/projects/[ref]/members,
-- src/app/(app)/people/page.tsx's Grant/Revoke Product button) to grant
-- access one person at a time.

begin;

insert into project_members (project_id, person_id, role)
select p.id, pe.id, grants.role
from (values
  ('orhan@greydigi.com', 'project_admin'),
  ('manh@greydigi.com', 'member'),
  ('jun@greydigi.com', 'member'),
  ('chris@greydigi.com', 'member')
) as grants(email, role)
join people pe on pe.email = grants.email
join projects p on p.ref = 'NK-P1'
on conflict (project_id, person_id) do update set role = excluded.role;

-- Product access: everyone had it before 0022 (Product was workspace-wide
-- with no scoping at all); granting it back to the same people restores
-- that, using the new fn_my_product_access() mechanism instead of no
-- mechanism at all. Narrow this later via the People page toggle if not
-- everyone here actually needs Product.
insert into space_roles (person_id, space, role)
select pe.id, 'product', 'member'
from people pe
where pe.email in ('orhan@greydigi.com', 'manh@greydigi.com', 'jun@greydigi.com', 'chris@greydigi.com')
on conflict (person_id, space) do nothing;

commit;

-- Verify before trusting it:
--   select p.email, pm.role from project_members pm join people p on p.id = pm.person_id;
--   select p.email, sr.space, sr.role from space_roles sr join people p on p.id = sr.person_id;
