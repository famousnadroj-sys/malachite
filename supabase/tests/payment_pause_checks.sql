begin;

do $$
begin
  if has_table_privilege('authenticated','public.paiements','INSERT')
     or has_table_privilege('anon','public.paiements','INSERT') then
    raise exception 'payment_intake_must_be_closed_for_client_roles';
  end if;

  if has_table_privilege('authenticated','public.paiements','UPDATE')
     or has_table_privilege('authenticated','public.paiements','DELETE') then
    raise exception 'direct_payment_mutations_must_remain_revoked';
  end if;

  if not has_table_privilege('authenticated','public.paiements','SELECT') then
    raise exception 'existing_payment_history_must_remain_readable';
  end if;

  if has_table_privilege('authenticated','public.config','SELECT')
     or has_table_privilege('authenticated','public.config','INSERT')
     or has_table_privilege('authenticated','public.config','UPDATE')
     or has_table_privilege('authenticated','public.config','DELETE') then
    raise exception 'payment_destination_config_must_not_be_client_accessible';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='config' and policyname='voir config'
  ) then
    raise exception 'public_config_read_policy_must_be_removed';
  end if;

  if (select count(*) from public.config) <> 1 then
    raise exception 'payment_destination_config_must_be_preserved_for_admin_reconfiguration';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='paiements'
      and policyname='declarer un paiement'
  ) then
    raise exception 'retired_payment_insert_policy_must_be_removed';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='payment receipts owner upload'
  ) then
    raise exception 'new_payment_receipt_upload_policy_must_be_removed';
  end if;

  if (select count(*) from public.paiements) <> 1 then
    raise exception 'existing_payment_history_must_not_be_deleted';
  end if;
end
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);

do $blocked_insert$
begin
  begin
    insert into public.paiements(user_id,offre,code,operateur,receipt_path)
    values(auth.uid(),'Boost','NEW-REF-5678','airtel','50000000-0000-0000-0000-000000000001/new.png');
    raise exception 'payment_insert_was_accepted';
  exception when insufficient_privilege then
    null;
  end;
end
$blocked_insert$;

do $history_read$
begin
  if (select count(*) from public.paiements) <> 1 then
    raise exception 'existing_payment_history_not_readable';
  end if;
end
$history_read$;

do $config_read$
begin
  begin
    perform cle from public.config;
    raise exception 'client_config_read_was_accepted';
  exception when insufficient_privilege then
    null;
  end;
end
$config_read$;

reset role;
rollback;
