-- Bound the retention of hashed login-attempt metadata.
-- The throttle only supports windows up to one hour; 24 hours is sufficient
-- for enforcement while preventing the table from growing indefinitely.
create index if not exists username_login_attempts_attempted_at_idx
  on public.username_login_attempts(attempted_at);

create or replace function private.cleanup_username_login_attempts()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.username_login_attempts
   where attempted_at < pg_catalog.now() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.cleanup_username_login_attempts()
  from public, anon, authenticated, service_role;

select cron.schedule(
  'malachite-username-login-attempts-cleanup',
  '17 3 * * *',
  'select private.cleanup_username_login_attempts();'
);
