begin;
do $checks$
declare
  v_job_count integer;
  v_job_command text;
begin
  select count(*), min(command) into v_job_count, v_job_command
  from cron.job where jobname='malachite-ai-ops-worker';
  if v_job_count <> 1
     or v_job_command not like '%x-mal-timestamp%'
     or v_job_command not like '%x-mal-signature%'
     or v_job_command not like '%malachite_ai_worker_hmac%'
     or v_job_command like '%request_id%' then
    raise exception 'existing_signed_worker_cron_was_not_preserved';
  end if;
end
$checks$;

do $checks$
declare
  v_ts text;
  v_body text;
  v_signature text;
  v_second_ts text;
  v_second_body text;
  v_second_signature text;
  v_large_body text;
  v_large_signature text;
begin
  v_ts := extract(epoch from clock_timestamp())::bigint::text;
  v_body := '{"trigger":"manual"}';
  v_signature := encode(extensions.hmac(
    convert_to(v_ts || '.' || v_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');

  if public.verify_malachite_ai_worker_signature(v_ts,v_body,v_signature) is not true then
    raise exception 'first_valid_signed_legacy_body_rejected';
  end if;
  if public.verify_malachite_ai_worker_signature(v_ts,v_body,v_signature) is not false then
    raise exception 'replayed_signed_legacy_body_accepted';
  end if;

  v_second_body := '{"trigger":"cron"}';
  v_second_signature := encode(extensions.hmac(
    convert_to(v_ts || '.' || v_second_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');
  if public.verify_malachite_ai_worker_signature(v_ts,v_second_body,v_second_signature) is not true then
    raise exception 'different_signed_request_rejected';
  end if;

  v_second_ts := (v_ts::bigint + 1)::text;
  v_second_signature := encode(extensions.hmac(
    convert_to(v_second_ts || '.' || v_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');
  if public.verify_malachite_ai_worker_signature(v_second_ts,v_body,v_second_signature) is not true then
    raise exception 'new_timestamp_signed_request_rejected';
  end if;

  if public.verify_malachite_ai_worker_signature(v_ts,v_body,repeat('0',64)) is not false then
    raise exception 'invalid_signature_accepted';
  end if;
  if public.verify_malachite_ai_worker_signature('1',v_body,v_signature) is not false then
    raise exception 'expired_timestamp_accepted';
  end if;

  v_large_body := jsonb_build_object('trigger',repeat('é',4090))::text;
  if length(v_large_body) >= 8192 or octet_length(v_large_body) <= 8192 then
    raise exception 'utf8_oversize_fixture_does_not_cross_byte_limit';
  end if;
  v_large_signature := encode(extensions.hmac(
    convert_to(v_ts || '.' || v_large_body,'UTF8'),
    convert_to('isolated-test-secret-do-not-use-in-production','UTF8'),
    'sha256'
  ),'hex');
  if public.verify_malachite_ai_worker_signature(v_ts,v_large_body,v_large_signature) is not false then
    raise exception 'oversized_utf8_signed_body_accepted';
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
