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
     or v_job_command like '%request_id%' then
    raise exception 'existing_signed_cron_not_preserved_when_optional_url_ref_missing';
  end if;
  if to_regclass('private.malachite_ai_worker_nonces') is null then
    raise exception 'nonce_table_missing_when_optional_url_ref_missing';
  end if;
end
$checks$;
