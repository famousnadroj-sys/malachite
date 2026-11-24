-- Run against staging after applying all Malachite migrations.
do $$
begin
  if not has_table_privilege('authenticated','public.config','SELECT') then
    raise exception 'authenticated_config_select_required_for_payment_operator_labels';
  end if;
  if has_table_privilege('authenticated','public.config','INSERT')
     or has_table_privilege('authenticated','public.config','UPDATE')
     or has_table_privilege('authenticated','public.config','DELETE') then
    raise exception 'authenticated_direct_config_mutation_must_be_revoked';
  end if;

  if not has_table_privilege('authenticated','public.statuts','SELECT') then
    raise exception 'authenticated_status_select_required_for_public_entitlement_badges';
  end if;
  if has_table_privilege('authenticated','public.statuts','INSERT')
     or has_table_privilege('authenticated','public.statuts','UPDATE')
     or has_table_privilege('authenticated','public.statuts','DELETE') then
    raise exception 'authenticated_direct_status_mutation_must_be_revoked';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='config'
      and policyname='voir config' and cmd='SELECT'
      and roles @> array['authenticated']::name[]
  ) then
    raise exception 'config_read_policy_missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='statuts'
      and policyname='voir les statuts' and cmd='SELECT'
      and roles @> array['authenticated']::name[]
  ) then
    raise exception 'status_read_policy_missing';
  end if;
end
$$;
