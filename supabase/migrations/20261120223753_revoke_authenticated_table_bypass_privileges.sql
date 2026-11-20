begin;

-- Remove table-level bypass privileges from signed-in application users.
-- Ordinary SELECT/INSERT/UPDATE/DELETE grants remain controlled by RLS.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Anonymous users must not receive direct access to application tables/sequences.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Harden default privileges for objects created by the postgres migration role.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

commit;
