-- Run after migrations in the local smoke test only (mirrors what a real
-- Supabase project already grants automatically).
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
