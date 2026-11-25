begin;
do $checks$
declare
  v_ts text;
  v_body text;
  v_nonce uuid := '10000000-0000-4000-8000-000000000001';
  v_signature text;
  v_second_nonce uuid := '20000000-0000-4000-8000-000000000002';
  v_second_body text;
  v_second_signature text;
begin
  v_ts := extract(epoch from clock_timestamp())::bigint::text;
  v_body := jsonb_build_object('trigger','manual','request_id',v_nonce::text)::text;
  v_signature := encode(extensions.hmac(
    convert_to(v_ts || '.' || v_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');

  if public.verify_malachite_ai_worker_signature(v_ts,v_body,v_signature) is not true then
    raise exception 'first_valid_signed_request_rejected';
  end if;
  if public.verify_malachite_ai_worker_signature(v_ts,v_body,v_signature) is not false then
    raise exception 'replayed_signed_request_accepted';
  end if;

  v_second_body := jsonb_build_object('trigger','cron','request_id',v_second_nonce::text)::text;
  v_second_signature := encode(extensions.hmac(
    convert_to(v_ts || '.' || v_second_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');
  if public.verify_malachite_ai_worker_signature(v_ts,v_second_body,v_second_signature) is not true then
    raise exception 'second_unique_signed_request_rejected';
  end if;

  if public.verify_malachite_ai_worker_signature(v_ts,v_second_body,repeat('0',64)) is not false then
    raise exception 'invalid_signature_accepted';
  end if;
  if public.verify_malachite_ai_worker_signature(v_ts,'{"trigger":"cron"}',v_signature) is not false then
    raise exception 'request_without_nonce_accepted';
  end if;
  if public.verify_malachite_ai_worker_signature('1',v_second_body,v_second_signature) is not false then
    raise exception 'expired_timestamp_accepted';
  end if;

  if has_function_privilege('anon','public.verify_malachite_ai_worker_signature(text,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.verify_malachite_ai_worker_signature(text,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.verify_malachite_ai_worker_signature(text,text,text)','EXECUTE') then
    raise exception 'worker_signature_rpc_acl_invalid';
  end if;
  if has_table_privilege('anon','private.malachite_ai_worker_nonces','SELECT')
     or has_table_privilege('authenticated','private.malachite_ai_worker_nonces','SELECT')
     or has_table_privilege('service_role','private.malachite_ai_worker_nonces','SELECT') then
    raise exception 'worker_nonce_table_must_remain_private';
  end if;
end
$checks$;
rollback;
