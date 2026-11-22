-- Read-only verification for MALACHITE Match hardening.
-- Run only after the Match migration has been applied to a staging database.

select
  to_regclass('private.match_daily_like_events') is not null as daily_like_table_exists,
  coalesce((select relrowsecurity from pg_class where oid='private.match_daily_like_events'::regclass), false) as daily_like_table_rls_enabled,
  to_regprocedure('private.enforce_match_daily_like_limit()') is not null as trigger_function_exists,
  to_regprocedure('public.match_like_quota()') is not null as quota_rpc_exists,
  to_regprocedure('public.match_received_likes()') is not null as received_likes_rpc_exists;

select tgname, tgenabled
from pg_trigger
where tgrelid='public.avis_match'::regclass
  and tgname='enforce_match_daily_like_limit'
  and not tgisinternal;

select n.nspname as schema_name, p.proname,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in ('match_like_quota','match_received_likes'))
   or (n.nspname='private' and p.proname in ('enforce_match_daily_like_limit','match_like_quota','match_received_likes'))
order by n.nspname,p.proname;

do $$
begin
  if to_regclass('private.match_daily_like_events') is null then
    raise exception 'match_daily_like_table_missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='private.match_daily_like_events'::regclass) then
    raise exception 'match_daily_like_rls_missing';
  end if;
  if has_table_privilege('anon','private.match_daily_like_events','SELECT')
     or has_table_privilege('authenticated','private.match_daily_like_events','SELECT') then
    raise exception 'match_daily_like_table_exposed';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.avis_match'::regclass
      and tgname='enforce_match_daily_like_limit'
      and not tgisinternal
      and tgenabled <> 'D'
  ) then
    raise exception 'match_daily_like_trigger_missing';
  end if;
  if has_function_privilege('anon','public.match_like_quota()','EXECUTE')
     or has_function_privilege('anon','public.match_received_likes()','EXECUTE') then
    raise exception 'anon_can_execute_match_rpc';
  end if;
  if not has_function_privilege('authenticated','public.match_like_quota()','EXECUTE')
     or not has_function_privilege('authenticated','public.match_received_likes()','EXECUTE') then
    raise exception 'authenticated_match_rpc_grants_missing';
  end if;
end
$$;
