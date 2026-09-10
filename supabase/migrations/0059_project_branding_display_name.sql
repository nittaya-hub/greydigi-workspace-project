-- Two more per-project portal customization fields, alongside the three
-- from 0037_project_branding.sql: an editable display name shown next
-- to the client's logo (defaults to the client's real name -- see
-- getProjectBranding's own fallback), and a toggle for whether the
-- header shows that name at all or just the logo. Both are cosmetic,
-- same as logo/accent/headline -- no publish step, no RLS change needed
-- (the existing project_branding policies already cover these columns).
alter table project_branding add column client_display_name text;
alter table project_branding add column show_client_name boolean not null default true;
