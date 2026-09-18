-- Real profile pictures: people.avatar_initials (a computed fallback,
-- e.g. "CS") stays untouched -- this adds an optional real image on top
-- of it, shown instead of the initials circle wherever one exists (the
-- Sidebar's own account footer, task Owner columns, assignee pickers).
--
-- Public bucket (not delivery-documents, which is deliberately private):
-- a profile photo is low-sensitivity and needs to render as a plain
-- <img src> in many places (task rows, dropdowns) without minting a
-- signed URL per render. Write access is still real -- a person can only
-- write under their own <person_id>/ prefix, resolved from auth.uid()
-- through people.auth_user_id, matching this schema's existing pattern
-- for "the caller acting on their own row."

begin;

alter table people
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (
      select id::text from people where auth_user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (
      select id::text from people where auth_user_id = auth.uid()
    )
  );

commit;
