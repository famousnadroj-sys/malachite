do $checks$
declare
  v_job_count integer;
  v_command text;
begin
  select count(*),min(command) into v_job_count,v_command
  from cron.job where jobname='malachite-ai-ops-worker';
  if v_job_count<>1 or v_command not like '%x-mal-timestamp%' or v_command not like '%x-mal-signature%' then
    raise exception 'project_mismatch_preflight_must_preserve_existing_cron';
  end if;
end
$checks$;
