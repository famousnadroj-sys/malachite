begin;
-- Inspect the private function definition as the database owner before switching
-- to the restricted client role. The client must not receive USAGE on schema private.
do $$
begin
  if position('public.deblocages' in pg_get_functiondef('private.contact_de(uuid)'::regprocedure))=0 then
    raise exception 'guarded_contact_rpc_must_preserve_legacy_entitlements';
  end if;
end
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare
  v_count integer;
  v_badge record;
begin
  select count(*) into v_count from public.statuts;
  if v_count <> 1 then raise exception 'direct_status_read_not_owner_only: %',v_count; end if;
  select count(*) into v_count from public.public_status_badges();
  if v_count <> 1 then raise exception 'public_badges_must_exclude_blocked_suspended_private_profiles: %',v_count; end if;
  select * into v_badge from public.public_status_badges();
  if v_badge.user_id <> auth.uid() or not v_badge.premium_active or not v_badge.verified_active or not v_badge.boost_active then
    raise exception 'own_public_badge_projection_invalid';
  end if;
  if has_table_privilege('authenticated','public.deblocages','SELECT')
     or has_table_privilege('authenticated','public.deblocages','INSERT')
     or has_table_privilege('authenticated','public.deblocages','UPDATE')
     or has_table_privilege('authenticated','public.deblocages','DELETE')
     or has_table_privilege('anon','public.deblocages','SELECT')
     or has_table_privilege('anon','public.deblocages','INSERT') then
    raise exception 'legacy_contact_unlock_table_must_not_be_directly_accessible';
  end if;
  if has_table_privilege('anon','public.campagnes','SELECT')
     or has_table_privilege('anon','public.campagnes','INSERT')
     or has_table_privilege('authenticated','public.campagnes','SELECT')
     or has_table_privilege('authenticated','public.campagnes','INSERT')
     or has_table_privilege('authenticated','public.campagnes','UPDATE')
     or has_table_privilege('authenticated','public.campagnes','DELETE') then
    raise exception 'retired_campaign_table_must_not_be_directly_accessible';
  end if;
  if not has_function_privilege('authenticated','public.public_status_badges()','EXECUTE')
     or has_function_privilege('anon','public.public_status_badges()','EXECUTE') then
    raise exception 'public_status_badges_permissions_invalid';
  end if;
end
$$;
rollback;
