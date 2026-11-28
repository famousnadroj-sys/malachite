begin;
insert into public.login_names(user_id,username)
values('50000000-0000-0000-0000-000000000001','Nadroj');

do $acl$
begin
 if has_table_privilege('authenticated','public.login_names','select')
    or has_table_privilege('authenticated','public.login_names','insert')
    or has_table_privilege('authenticated','public.login_names','update')
    or has_table_privilege('authenticated','public.login_names','delete') then
  raise exception 'browser_roles_must_not_access_username_mapping';
 end if;
 if not has_table_privilege('service_role','public.login_names','select') then
  raise exception 'username_login_edge_service_role_must_read_mapping';
 end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='login_names') then
  raise exception 'username_mapping_must_have_no_browser_policies';
 end if;
 if has_table_privilege('authenticated','public.username_login_attempts','select') then
  raise exception 'browser_must_not_read_login_attempts';
 end if;
 if has_function_privilege('authenticated','public.consume_username_login_attempt(text,integer,integer)','execute')
    or has_function_privilege('anon','public.consume_username_login_attempt(text,integer,integer)','execute') then
  raise exception 'browser_roles_must_not_execute_login_throttle';
 end if;
end
$acl$;

set local role service_role;
do $service_read$
begin
 if (select count(*) from public.login_names where username='Nadroj')<>1 then
  raise exception 'service_role_login_edge_must_read_mapping';
 end if;
end
$service_read$;
reset role;

set local role service_role;
do $throttle$
declare v_hash text:=repeat('a',64);
begin
 if not public.consume_username_login_attempt(v_hash,900,2) then raise exception 'first_attempt_must_pass'; end if;
 if not public.consume_username_login_attempt(v_hash,900,2) then raise exception 'second_attempt_must_pass'; end if;
 if public.consume_username_login_attempt(v_hash,900,2) then raise exception 'third_attempt_must_be_throttled'; end if;
 begin
  perform public.consume_username_login_attempt('bad-hash',900,2);
  raise exception 'invalid_hash_must_be_rejected';
 exception when others then
  if sqlerrm='invalid_hash_must_be_rejected' then raise; end if;
 end;
end
$throttle$;
reset role;

do $uniqueness$
begin
 begin
  insert into public.login_names(user_id,username)
  values('60000000-0000-0000-0000-000000000001','nadroj');
  raise exception 'username_must_be_case_insensitive_unique';
 exception when unique_violation then null;
 end;
end
$uniqueness$;

do $retention$
begin
 if not exists(select 1 from pg_indexes where schemaname='public' and indexname='username_login_attempts_attempted_at_idx') then
  raise exception 'login_attempt_retention_index_missing';
 end if;
 if not exists(select 1 from cron.job where jobname='malachite-username-login-attempts-cleanup' and schedule='17 3 * * *' and active) then
  raise exception 'login_attempt_cleanup_cron_missing';
 end if;
 if has_function_privilege('anon','private.cleanup_username_login_attempts()','execute')
    or has_function_privilege('authenticated','private.cleanup_username_login_attempts()','execute')
    or has_function_privilege('service_role','private.cleanup_username_login_attempts()','execute') then
  raise exception 'login_attempt_cleanup_must_not_be_callable_by_api_roles';
 end if;
 insert into public.username_login_attempts(ip_hash,attempted_at)
 values(repeat('c',64),now()-interval '2 days'),(repeat('d',64),now());
 perform private.cleanup_username_login_attempts();
 if exists(select 1 from public.username_login_attempts where ip_hash=repeat('c',64)) then
  raise exception 'stale_login_attempts_not_cleaned';
 end if;
 if not exists(select 1 from public.username_login_attempts where ip_hash=repeat('d',64)) then
  raise exception 'recent_login_attempts_were_deleted';
 end if;
end
$retention$;

rollback;
