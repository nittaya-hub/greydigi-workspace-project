-- Hypercare wave 4.2 (Queue & capacity), first slice: "one queue per
-- person across missions and services" needs a person to actually own
-- each piece of Hypercare work first -- project_tasks already has
-- assignee_person_id (Missions' half already exists), but incidents,
-- support_requests and service_changes have no assignee field at all
-- today. This adds one, nullable, on every one of the three so existing
-- rows don't need backfilling to stay valid.
--
-- "Protected capacity" and "interrupt discipline" (the rest of wave
-- 4.2) are deliberately NOT built here -- neither source document
-- specifies what either means as a concrete rule (a WIP limit? a
-- reserved-hours field?), so encoding one now would be inventing a
-- business rule, not implementing one. The queue itself -- what a
-- person actually owns, sorted by urgency -- is the real, buildable
-- part; that judgement call is left to a person, same as the
-- escape-valve threshold in service_changes already is.

alter table incidents add column if not exists assigned_person_id uuid references people (id) on delete set null;
alter table support_requests add column if not exists assigned_person_id uuid references people (id) on delete set null;
alter table service_changes add column if not exists assigned_person_id uuid references people (id) on delete set null;

create index if not exists incidents_assigned_idx on incidents (assigned_person_id);
create index if not exists support_requests_assigned_idx on support_requests (assigned_person_id);
create index if not exists service_changes_assigned_idx on service_changes (assigned_person_id);
