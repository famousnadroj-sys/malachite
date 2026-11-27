-- Keep only the private helper execution required by live RLS policies.
-- Public SECURITY DEFINER RPC wrappers call private implementation functions
-- as their owner, so authenticated clients do not need direct EXECUTE grants.
-- RLS policies still need these five narrow predicates under authenticated:
-- is_admin, is_blocked_with, is_suspended, account_exists, blocked_text.

revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.is_suspended(uuid) to authenticated;
grant execute on function private.account_exists(uuid) to authenticated;
grant execute on function private.blocked_text(text) to authenticated;

-- Keep future private functions closed by default for the migration owner.
alter default privileges in schema private revoke execute on functions from public;
