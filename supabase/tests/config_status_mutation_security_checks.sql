-- Run against staging after all security migrations.
-- Payment intake remains paused: config values (including payment destinations)
-- are intentionally hidden from client roles until a separately approved activation.
do $checks$
begin
  if has_table_privilege('authenticated','public.config','SELECT')
     or has_table_privilege('authenticated','public.config','INSERT')
     or has_table_privilege('authenticated','public.config','UPDATE')
     or has_table_privilege('authenticated','public.config','DELETE')
     or has_table_privilege('anon','public.config','SELECT')
     or has_table_privilege('anon','public.config','INSERT') then
    raise exception 'payment_destination_config_must_remain_hidden_while_intake_paused';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='config'
  ) then
    raise exception 'client_config_policies_must_remain_absent_while_intake_paused';
  end if;

  if not has_table_privilege('authenticated','public.statuts','SELECT') then
    raise exception 'authenticated_status_select_required_for_own_entitlement_badges';
  end if;
  if has_table_privilege('authenticated','public.statuts','INSERT')
     or has_table_privilege('authenticated','public.statuts','UPDATE')
     or has_table_privilege('authenticated','public.statuts','DELETE')
     or has_table_privilege('anon','public.statuts','SELECT') then
    raise exception 'status_table_must_be_read_only_for_authenticated_owner';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='statuts'
      and policyname='read own entitlement status' and cmd='SELECT'
      and roles @> array['authenticated']::name[]
      and position('auth.uid()' in qual)>0
      and position('user_id' in qual)>0
  ) then
    raise exception 'status_read_policy_must_be_owner_only';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='statuts'
      and policyname='voir les statuts'
  ) then
    raise exception 'legacy_public_status_policy_must_be_removed';
  end if;
end
$checks$;
