-- New private-schema functions must not inherit API-role EXECUTE grants.
-- Apply this for the postgres owner used by the current private schema.
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;