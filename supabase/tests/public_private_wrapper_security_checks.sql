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

  -- Audit the nine SECURITY DEFINER entry points flagged by production Advisor.
  foreach v_signature in array array[
    'public.admin_malachite_referrals()',
    'public.est_match(uuid)',
    'public.founder_business_overview(timestamptz,timestamptz)',
    'public.founder_finance_summary(timestamptz,timestamptz)',
    'public.get_malachite_referrer_preview(uuid)',
    'public.match_like_quota()',
    'public.match_received_likes()',
    'public.match_relation_compatible_ids()',
    'public.start_call_session(uuid,uuid,text,text,timestamptz)'
  ] loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then raise exception 'advisor_function_missing: %', v_signature; end if;
    if not (select prosecdef from pg_proc where oid=v_oid) then
      raise exception 'advisor_function_expected_security_definer: %', v_signature;
    end if;
    if not exists(select 1 from pg_proc where oid=v_oid and proconfig @> array['search_path=""']) then
      raise exception 'advisor_function_empty_search_path_required: %', v_signature;
    end if;
    if v_signature = 'public.start_call_session(uuid,uuid,text,text,timestamptz)' then
      -- Calls remain paused: the ACL normalization migration revokes client execution.
      if has_function_privilege('anon',v_oid,'EXECUTE')
         or has_function_privilege('authenticated',v_oid,'EXECUTE') then
        raise exception 'paused_call_rpc_must_not_be_client_executable';
      end if;
      continue;
    elsif v_signature = 'public.get_malachite_referrer_preview(uuid)' then
      if not has_function_privilege('anon',v_oid,'EXECUTE')
         or not has_function_privilege('authenticated',v_oid,'EXECUTE') then
        raise exception 'public_referral_preview_grant_missing';
      end if;
    elsif has_function_privilege('anon',v_oid,'EXECUTE')
       or not has_function_privilege('authenticated',v_oid,'EXECUTE') then
      raise exception 'advisor_function_client_acl_invalid: %', v_signature;
    end if;
  end loop;

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

  -- These entry points are callable by authenticated clients, but must reject
  -- a caller without an authenticated user/admin identity.
  if public.est_match('00000000-0000-0000-0000-000000000001'::uuid) then
    raise exception 'est_match_returned_true_without_identity';
  end if;
  begin perform public.match_like_quota(); raise exception 'match_like_quota_accepted_anonymous_context'; exception when others then if sqlerrm <> 'match_auth_required' then raise; end if; end;
  begin perform public.match_received_likes(); raise exception 'match_received_likes_accepted_anonymous_context'; exception when others then if sqlerrm <> 'match_auth_required' then raise; end if; end;
  begin perform public.match_relation_compatible_ids(); raise exception 'match_relation_compatible_ids_accepted_anonymous_context'; exception when others then if sqlerrm <> 'match_auth_required' then raise; end if; end;
  begin perform public.admin_malachite_referrals(); raise exception 'admin_referrals_accepted_non_admin'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  begin perform public.founder_business_overview(null,null); raise exception 'founder_business_overview_accepted_non_admin'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  begin perform * from public.founder_finance_summary(null,null); raise exception 'founder_finance_summary_accepted_non_admin'; exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;
  if has_function_privilege('authenticated','public.start_call_session(uuid,uuid,text,text,timestamptz)','EXECUTE') then
    raise exception 'paused_call_rpc_must_not_be_client_executable';
  end if;
  if exists(select 1 from public.get_malachite_referrer_preview('00000000-0000-0000-0000-000000000001'::uuid)) then
    raise exception 'empty_referral_preview_returned_rows';
  end if;

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
