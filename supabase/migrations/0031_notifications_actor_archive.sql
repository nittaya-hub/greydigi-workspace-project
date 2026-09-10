-- Notifications: who it's from, and an archive action separate from
-- read/unread (so opening one to read it doesn't need to also hide it —
-- archiving is a deliberate second step).
alter table notifications add column actor_label text;
alter table notifications add column is_archived boolean not null default false;

-- Sample data so the page has something to show and the read/archive/
-- detail behavior can be tested — one run only (re-running this file
-- duplicates these rows, since there's no natural unique key to key an
-- upsert off). Delete manually afterward if you don't want to keep it.
insert into notifications (workspace_id, person_id, kind, title, body, related_url, actor_label, is_read, created_at)
select p.workspace_id, p.id, v.kind, v.title, v.body, v.related_url, v.actor_label, false,
  now() - (v.minutes_ago || ' minutes')::interval
from people p
cross join (
  values
    ('client_message', 'New message from Nutrition Kitchen', 'L.T. Low asked about the Friday cut-off timing for week two.', '/hypercare/submissions', 'L.T. Low · Nutrition Kitchen', 12),
    ('gate_held', 'G4 held on NK-P1', 'Cutover gate is waiting on named acceptance before it can clear.', '/delivery/gates', 'System · Delivery', 45),
    ('incident', 'New incident opened', 'Order ingestion is returning validation errors for two SKUs.', '/hypercare/incidents', 'System · Hypercare', 180),
    ('task_comment_added', 'Orhan commented on a task', 'Let''s confirm the schema sign-off date before we lock W2.', '/delivery/tasks', 'Orhan Yilmaz', 300)
) as v(kind, title, body, related_url, actor_label, minutes_ago)
where p.kind = 'internal';
