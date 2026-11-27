do $checks$
declare
  v_job_count integer;
  v_job_command text;
  v_verifier_definition text;
begin
  select count(*), min(command) into v_job_count, v_job_command
  from cron.job where jobname='malachite-ai-ops-worker';
  if v_job_count <> 1
     or v_job_command not like '%x-mal-timestamp%'
     or v_job_command not like '%x-mal-signature%' then
    raise exception 'signed_worker_cron_must_remain_unchanged_when_hmac_missing';
  end if;
  if to_regclass('private.malachite_ai_worker_nonces') is null then
    raise exception 'nonce_table_must_remain_after_hmac_preflight_abort';
  end if;
  select pg_get_functiondef('public.verify_malachite_ai_worker_signature(text,text,text)'::regprocedure)
  into v_verifier_definition;
  if position('v_nonce_hex := lower(p_signature)' in lower(v_verifier_definition))=0 then
    raise exception 'replay_verifier_must_remain_installed_after_hmac_preflight_abort';
  end if;
end
$checks$;
