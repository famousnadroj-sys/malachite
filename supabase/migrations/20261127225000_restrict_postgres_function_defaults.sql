-- PostgreSQL's built-in default is EXECUTE for PUBLIC. A schema-local
-- REVOKE cannot cancel a global default grant, so close global defaults for
-- postgres-owned functions and explicitly preserve the API grants that this
-- project currently relies on in public and storage.
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated;

alter default privileges for role postgres in schema storage
  grant execute on functions to anon, authenticated;