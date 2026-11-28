do $checks$
begin
  if to_regnamespace('cron') is not null or to_regnamespace('net') is not null then
    raise exception 'no_scheduler_fixture_must_not_have_cron_or_net';
  end if;
  if to_regclass('private.malachite_ai_worker_nonces') is null then
    raise exception 'nonce_table_missing_without_scheduler_extensions';
  end if;
  if to_regprocedure('public.verify_malachite_ai_worker_signature(text,text,text)') is null then
    raise exception 'nonce_verifier_missing_without_scheduler_extensions';
  end if;
end
$checks$;
