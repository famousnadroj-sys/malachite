-- Keep only the private helper execution required by live RLS policies.
-- Public SECURITY DEFINER RPC wrappers call private implementation functions
-- as their owner, so authenticated clients do not need direct EXECUTE grants.
-- The production schema currently uses four helpers in policies; staging also
-- uses account_exists(uuid). Grant it only when it exists.
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.is_suspended(uuid) to authenticated;
grant execute on function private.blocked_text(text) to authenticated;

do $grant_optional$
begin
  if to_regprocedure('private.account_exists(uuid)') is not null then
    execute 'grant execute on function private.account_exists(uuid) to authenticated';
  end if;
end
$grant_optional$;

-- This schema-local default revoke does not override global default ACLs;
-- the following migration closes postgres-owned function defaults globally
-- while restoring the existing API defaults for public and storage.
alter default privileges in schema private revoke execute on functions from public;