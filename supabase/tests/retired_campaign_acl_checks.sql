do $$
begin
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
