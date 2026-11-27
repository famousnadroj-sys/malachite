-- Verify private implementation functions are not directly executable by API roles.
-- Five narrow predicates remain executable because active RLS policies call them.
begin;

do $$
declare
  v_bad text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    into v_bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if v_bad is not null then
    raise exception 'anon_can_execute_private_functions: %', v_bad;
  end if;

  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    into v_bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and p.oid::regprocedure::text not in (
      'private.is_admin()',
      'private.is_blocked_with(uuid)',
      'private.is_suspended(uuid)',
      'private.account_exists(uuid)',
      'private.blocked_text(text)'
    );

  if v_bad is not null then
    raise exception 'authenticated_can_execute_private_implementation_functions: %', v_bad;
  end if;

  if not has_function_privilege('authenticated', 'private.is_admin()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.is_blocked_with(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.is_suspended(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.account_exists(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.blocked_text(text)', 'EXECUTE') then
    raise exception 'required_rls_helper_execute_grant_missing';
  end if;

  if has_function_privilege('anon', 'public.get_malachite_referrer_preview(uuid)', 'EXECUTE') is false then
    raise exception 'public_referrer_preview_anon_contract_changed';
  end if;

  if not has_function_privilege('authenticated', 'public.contact_de(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.moderate_user(uuid,text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.traiter_paiement(bigint,boolean,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.match_like_quota()', 'EXECUTE') then
    raise exception 'public_rpc_wrapper_grant_missing';
  end if;
end
$$;

-- Prove future functions inherit the intended schema-specific defaults.
create function private.__malachite_private_acl_probe() returns integer language sql as 'select 1';
create function public.__malachite_public_acl_probe() returns integer language sql as 'select 1';

do $acl$
begin
  if has_function_privilege('anon', 'private.__malachite_private_acl_probe()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.__malachite_private_acl_probe()', 'EXECUTE') then
    raise exception 'future_private_function_must_default_to_closed';
  end if;
  if not has_function_privilege('anon', 'public.__malachite_public_acl_probe()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.__malachite_public_acl_probe()', 'EXECUTE') then
    raise exception 'future_public_rpc_default_grants_must_be_preserved';
  end if;
end
$acl$;

drop function private.__malachite_private_acl_probe();
drop function public.__malachite_public_acl_probe();

-- Verify the referral preview keeps the privacy guards in its SECURITY DEFINER body.
do $preview$
declare
  v_definition text := pg_get_functiondef('public.get_malachite_referrer_preview(uuid)'::regprocedure);
begin
  if position('not private.is_suspended(p.id)' in v_definition)=0
     or position('not private.is_blocked_with(p.id)' in v_definition)=0 then
    raise exception 'referrer_preview_privacy_guards_missing';
  end if;
  if pg_get_function_result('public.get_malachite_referrer_preview(uuid)'::regprocedure)
       <> 'TABLE(prenom text, username text)' then
    raise exception 'referrer_preview_return_contract_changed';
  end if;
end
$preview$;

-- Exercise live RLS expressions as a non-admin authenticated identity.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select count(*) from public.profiles;
select count(*) from public.messages;
select count(*) from public.avis_match;
select count(*) from storage.objects;
reset role;

rollback;
