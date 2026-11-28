begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.campagnes'::regclass) then
    raise exception 'retired_campaign_rls_must_remain_enabled';
  end if;

  if exists (select 1 from pg_policy where polrelid='public.campagnes'::regclass) then
    raise exception 'retired_campaign_client_policies_must_be_removed';
  end if;

  if has_table_privilege('anon','public.campagnes','SELECT') or
     has_table_privilege('anon','public.campagnes','INSERT') or
     has_table_privilege('anon','public.campagnes','UPDATE') or
     has_table_privilege('anon','public.campagnes','DELETE') then
    raise exception 'anon_campaign_access_must_be_revoked';
  end if;

  if has_table_privilege('authenticated','public.campagnes','SELECT') or
     has_table_privilege('authenticated','public.campagnes','INSERT') or
     has_table_privilege('authenticated','public.campagnes','UPDATE') or
     has_table_privilege('authenticated','public.campagnes','DELETE') then
    raise exception 'authenticated_campaign_access_must_be_revoked';
  end if;
end
$$;
rollback;
