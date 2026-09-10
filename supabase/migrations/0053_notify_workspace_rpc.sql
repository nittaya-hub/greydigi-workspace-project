-- notifyWorkspace() (src/lib/data/notify.ts) did its own SELECT on
-- `people` then INSERT into `notifications`, both under the CALLING
-- session's own RLS. That works fine when the caller is an internal
-- member (people_read + notifications_insert_internal, 0007/0011_rls.sql,
-- both key off fn_my_internal_workspace_ids()) -- but
-- createClientSubmission (src/app/portal/[ref]/client-submission-actions.ts)
-- is also callable by a genuine external client (client_submissions_client
-- policy lets a client-portal person insert their own submission), and a
-- client-kind person is NOT covered by fn_my_internal_workspace_ids() --
-- so a real client's submission silently failed to notify anyone. Same
-- class of bug 0048 already fixed for the public share-link paths, just
-- tripped a different way here: an RLS-blocked insert that notifyWorkspace
-- never checked the error on, instead of an anonymous session with zero
-- internal-workspace scope.
--
-- This moves both the recipient lookup and the insert into one
-- security-definer round trip, the same pattern 0048 already
-- established -- so notifyWorkspace() works regardless of who the
-- caller is, and every one of its call sites across the app (nearly all
-- of them) drops from two sequential round trips to one, which is also
-- most of what was making a client submission feel slow.
create or replace function fn_notify_workspace(
  p_workspace_id uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_related_url text default null,
  p_actor_label text default null,
  p_exclude_person_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (workspace_id, person_id, kind, title, body, related_url, actor_label)
  select p_workspace_id, people.id, p_kind, p_title, p_body, p_related_url, p_actor_label
  from people
  where people.workspace_id = p_workspace_id
    and people.kind = 'internal'
    and (p_exclude_person_id is null or people.id <> p_exclude_person_id);
end;
$$;

revoke all on function fn_notify_workspace(uuid, text, text, text, text, text, uuid) from public;
grant execute on function fn_notify_workspace(uuid, text, text, text, text, text, uuid) to anon, authenticated;
