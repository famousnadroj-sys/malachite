do $checks$
begin
  if exists(select 1 from cron.job where jobname='malachite-ai-ops-worker') then
    raise exception 'worker_cron_must_not_be_scheduled_for_mismatched_project_ref';
  end if;
end
$checks$;
