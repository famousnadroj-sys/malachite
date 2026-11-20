-- Run against a staging database AFTER applying the Malachite migrations.
do $$
declare
  v_public boolean;
  v_check text;
  v_limit bigint;
  v_mime text[];
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='paiements' and column_name='receipt_path'
  ) then
    raise exception 'payment_receipt_path_column_missing';
  end if;

  select public, file_size_limit, allowed_mime_types
    into v_public, v_limit, v_mime
  from storage.buckets where id='payment-receipts';
  if v_public is distinct from false then
    raise exception 'payment_receipts_bucket_must_be_private';
  end if;
  if v_limit is distinct from 5242880 then
    raise exception 'payment_receipts_bucket_size_limit_must_be_5mb';
  end if;
  if not (v_mime @> array['image/jpeg','image/png','image/webp']::text[])
     or cardinality(v_mime) <> 3 then
    raise exception 'payment_receipts_bucket_mime_types_invalid';
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payment receipts owner upload') then
    raise exception 'payment_receipt_upload_policy_missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payment receipts owner or admin read') then
    raise exception 'payment_receipt_read_policy_missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payment receipts delete unlinked own') then
    raise exception 'payment_receipt_orphan_cleanup_policy_missing';
  end if;

  select lower(with_check) into v_check
  from pg_policies
  where schemaname='public' and tablename='paiements' and policyname='declarer un paiement';
  if v_check is null
     or position('receipt_path is not null' in v_check)=0
     or position('operateur' in v_check)=0
     or position('avis_match' in v_check)=0
     or position('storage.objects' in v_check)=0
     or position('foldername' in v_check)=0 then
    raise exception 'payment_insert_policy_missing_receipt_operator_storage_ownership_or_mutual_match_checks';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='paiements'
      and indexname='paiements_operator_reference_uidx'
  ) then
    raise exception 'payment_operator_reference_unique_index_missing';
  end if;

  if has_function_privilege('anon','public.traiter_paiement(bigint,boolean)','EXECUTE')
     or has_function_privilege('anon','public.traiter_paiement(bigint,boolean,text)','EXECUTE') then
    raise exception 'anonymous_role_can_execute_payment_review_rpc';
  end if;
  if not has_function_privilege('authenticated','public.traiter_paiement(bigint,boolean)','EXECUTE')
     or not has_function_privilege('authenticated','public.traiter_paiement(bigint,boolean,text)','EXECUTE') then
    raise exception 'authenticated_role_payment_review_rpc_grant_missing';
  end if;
end
$$;
