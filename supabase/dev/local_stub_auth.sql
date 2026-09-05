-- Local smoke-test stub only. Not part of the migration set — a real
-- Supabase project already provides the `auth` schema (auth.users,
-- auth.uid()). This exists purely to let the migrations + seed run
-- against a plain local Postgres for a syntax/logic smoke test.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end
$$;

-- Real Supabase projects pre-grant table-level access to anon/authenticated
-- on the public schema (RLS then filters rows); replicate that here so the
-- local smoke test exercises RLS the same way a real project would.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

