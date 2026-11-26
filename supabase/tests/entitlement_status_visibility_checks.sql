do $$
declare
  v_policy text;
  v_definition text;
begin
  select qual into v_policy
  from pg_policies
  where schemaname='public' and tablename='statuts'
    and policyname='read own entitlement status' and cmd='SELECT';
  if v_policy is null or position('auth.uid()' in v_policy)=0 or position('user_id' in v_policy)=0 then
    raise exception 'statuts_must_be_owner_only';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='statuts' and policyname='voir les statuts') then
    raise exception 'legacy_public_status_policy_must_be_removed';
  end if;
  select pg_get_functiondef('public.public_status_badges()'::regprocedure) into v_definition;
  if position('premium_until > now()' in v_definition)=0
     or position('verified_until > now()' in v_definition)=0
     or position('boost_until > now()' in v_definition)=0
     or position('private.is_suspended' in v_definition)=0
     or position('private.is_blocked_with' in v_definition)=0
     or position('profile_private = false' in v_definition)=0 then
    raise exception 'public_status_badges_must_return_only_safe_public_active_flags';
  end if;
  if not has_function_privilege('authenticated','public.public_status_badges()','EXECUTE')
     or has_function_privilege('anon','public.public_status_badges()','EXECUTE') then
    raise exception 'public_status_badges_permissions_invalid';
  end if;
  if has_table_privilege('anon','public.campagnes','SELECT')
     or has_table_privilege('anon','public.campagnes','INSERT')
     or has_table_privilege('anon','public.campagnes','UPDATE')
     or has_table_privilege('anon','public.campagnes','DELETE')
     or has_table_privilege('authenticated','public.campagnes','SELECT')
     or has_table_privilege('authenticated','public.campagnes','INSERT')
     or has_table_privilege('authenticated','public.campagnes','UPDATE')
     or has_table_privilege('authenticated','public.campagnes','DELETE') then
    raise exception 'retired_campaign_table_must_not_be_client_accessible';
  end if;
end
$$;
