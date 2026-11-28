do $support_acl$
begin
  if not (select relrowsecurity from pg_class where oid='public.demandes_support'::regclass) then
    raise exception 'support_rls_must_remain_enabled';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='demandes_support'
      and policyname='support_admin_update' and cmd='UPDATE'
      and coalesce(qual,'') like '%private.is_admin%'
      and coalesce(with_check,'') like '%private.is_admin%'
  ) then
    raise exception 'support_admin_update_must_remain_admin_scoped';
  end if;
  if has_table_privilege('authenticated','public.demandes_support','update') then
    raise exception 'support_table_wide_update_must_be_revoked';
  end if;
  if not has_column_privilege('authenticated','public.demandes_support','statut','update')
     or not has_column_privilege('authenticated','public.demandes_support','reponse_admin','update')
     or not has_column_privilege('authenticated','public.demandes_support','traite_par','update')
     or not has_column_privilege('authenticated','public.demandes_support','traite_le','update') then
    raise exception 'support_admin_required_column_grants_missing';
  end if;
  if not has_table_privilege('authenticated','public.demandes_support','insert')
     or not has_table_privilege('authenticated','public.demandes_support','select') then
    raise exception 'support_member_submission_or_read_grant_missing';
  end if;
end
$support_acl$;
