-- Run against staging after applying all Malachite migrations.
begin;
do $$
declare
  v_signature text;
  v_oid regprocedure;
begin
  if has_schema_privilege('anon','private','USAGE')
     or has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'private_schema_must_remain_unavailable_to_client_roles';
  end if;

  foreach v_signature in array array[
    'public.admin_duplicate_pending_payment_ids()',
    'public.blocked_user_ids()',
    'public.check_my_entitlement_expirations()',
    'public.contact_de(uuid)',
    'public.create_my_action_notification(text,text,text,text,text,text,uuid)',
    'public.create_my_notification(text,text,text,text)',
    'public.is_blocked_with(uuid)',
    'public.malachite_ai_manager_is_admin()',
    'public.moderate_user(uuid,text,text)',
    'public.my_blocked_profiles()',
    'public.publish_user_announcement(text,text,text,text)',
    'public.traiter_lot_paiements(bigint[])',
    'public.traiter_paiement(bigint,boolean)',
    'public.traiter_paiement(bigint,boolean,text)'
  ] loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then raise exception 'public_private_wrapper_missing: %', v_signature; end if;
    if not (select prosecdef from pg_proc where oid=v_oid) then
      raise exception 'public_private_wrapper_must_be_security_definer: %', v_signature;
    end if;
    if has_function_privilege('anon',v_oid,'EXECUTE') then
      raise exception 'anonymous_execute_must_be_revoked: %', v_signature;
    end if;
    if not has_function_privilege('authenticated',v_oid,'EXECUTE') then
      raise exception 'authenticated_execute_missing: %', v_signature;
    end if;
    if not exists(select 1 from pg_proc where oid=v_oid and proconfig @> array['search_path=""']) then
      raise exception 'empty_search_path_required: %', v_signature;
    end if;
  end loop;
end
$$;
set local role authenticated;
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.blocked_user_ids();
  select count(*) into v_count from public.my_blocked_profiles();
  if public.is_blocked_with('00000000-0000-0000-0000-000000000001'::uuid) then
    raise exception 'unauthenticated_block_check_must_not_return_true';
  end if;
  if public.malachite_ai_manager_is_admin() then
    raise exception 'unauthenticated_admin_check_must_not_return_true';
  end if;
  select count(*) into v_count from public.contact_de('00000000-0000-0000-0000-000000000001'::uuid);
  select count(*) into v_count from public.admin_duplicate_pending_payment_ids();

  begin perform public.check_my_entitlement_expirations(); raise exception 'expected_not_authenticated'; exception when others then if sqlerrm <> 'not_authenticated' then raise; end if; end;
  begin perform public.create_my_notification('system','Test notification','Test body','test-key-0001'); raise exception 'expected_not_authenticated'; exception when others then if sqlerrm <> 'not_authenticated' then raise; end if; end;
  begin perform public.create_my_action_notification('system','Test notification','Test body','test-key-0002',null,null,null); raise exception 'expected_not_authenticated'; exception when others then if sqlerrm <> 'not_authenticated' then raise; end if; end;
  begin perform public.moderate_user('00000000-0000-0000-0000-000000000001'::uuid,'suspend','test'); raise exception 'expected_admin_only'; exception when others then if sqlerrm <> 'admin_only' then raise; end if; end;
  begin perform public.publish_user_announcement('news','Test title','Test body','test-key-0003'); raise exception 'expected_forbidden'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  begin perform public.traiter_paiement(1,true); raise exception 'expected_interdit'; exception when others then if sqlerrm <> 'interdit' then raise; end if; end;
  begin perform public.traiter_lot_paiements(array[1]::bigint[]); raise exception 'expected_interdit'; exception when others then if sqlerrm <> 'interdit' then raise; end if; end;
end
$$;
rollback;
