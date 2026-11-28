-- Only RLS predicates require direct EXECUTE by authenticated. Public SECURITY
-- DEFINER RPC wrappers invoke their private implementations as their owner.
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.is_suspended(uuid) to authenticated;

-- Production may not yet have this staging-only helper; grant it only when it
-- exists, because staging policies reference it and production policies do not.
do $grant$
begin
 if to_regprocedure('private.account_exists(uuid)') is not null then
  execute 'grant execute on function private.account_exists(uuid) to authenticated';
 end if;
end
$grant$;

alter default privileges in schema private revoke execute on functions from public;
