-- Keep the public RPC as SECURITY INVOKER. The only privileged lookup remains
-- the existing private.is_admin() function, which evaluates auth.uid().
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.malachite_ai_manager_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select coalesce(private.is_admin(), false);
$$;
revoke all on function public.malachite_ai_manager_is_admin() from public, anon;
grant execute on function public.malachite_ai_manager_is_admin() to authenticated;
