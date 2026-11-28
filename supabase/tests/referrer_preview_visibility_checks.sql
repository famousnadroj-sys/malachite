begin;

-- Verify the referral endpoint remains callable by anonymous signup attribution.
do $check$
begin
  if not has_function_privilege('anon','public.get_malachite_referrer_preview(uuid)','EXECUTE') then
    raise exception 'anonymous_referrer_preview_execute_grant_missing';
  end if;
  if not has_function_privilege('authenticated','public.get_malachite_referrer_preview(uuid)','EXECUTE') then
    raise exception 'authenticated_referrer_preview_execute_grant_missing';
  end if;
  if has_function_privilege('public','public.get_malachite_referrer_preview(uuid)','EXECUTE') then
    raise exception 'public_role_referrer_preview_execute_must_be_revoked';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='get_malachite_referrer_preview'
      and pg_get_functiondef(p.oid) ilike '%profile_private%'
      and pg_get_functiondef(p.oid) ilike '%suspensions%'
      and pg_get_functiondef(p.oid) ilike '%blocages%'
  ) then
    raise exception 'referrer_preview_visibility_guards_missing';
  end if;
end
$check$;

rollback;
