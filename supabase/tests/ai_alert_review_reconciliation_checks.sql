begin;
do $acl$
begin
 if not (select relrowsecurity from pg_class where oid='public.malachite_ai_alerts'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.malachite_ai_review_queue'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.malachite_ai_settings'::regclass) then
  raise exception 'ai_queue_and_settings_rls_must_be_enabled';
 end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('malachite_ai_alerts','malachite_ai_review_queue','malachite_ai_settings')) then
  raise exception 'ai_queue_and_settings_must_have_no_browser_policies';
 end if;
 if has_table_privilege('authenticated','public.malachite_ai_alerts','select')
    or has_table_privilege('authenticated','public.malachite_ai_review_queue','select')
    or has_table_privilege('authenticated','public.malachite_ai_settings','select') then
  raise exception 'authenticated_must_not_read_ai_queue_or_settings_tables';
 end if;
 if not exists(select 1 from public.malachite_ai_settings where id=1 and ai_briefings_enabled=false) then
  raise exception 'fresh_ai_briefings_setting_must_default_off';
 end if;
 if not (has_table_privilege('service_role','public.malachite_ai_alerts','select')
    and has_table_privilege('service_role','public.malachite_ai_alerts','insert')
    and has_table_privilege('service_role','public.malachite_ai_alerts','update')
    and has_table_privilege('service_role','public.malachite_ai_alerts','delete')
    and has_table_privilege('service_role','public.malachite_ai_review_queue','select')
    and has_table_privilege('service_role','public.malachite_ai_review_queue','insert')
    and has_table_privilege('service_role','public.malachite_ai_review_queue','update')
    and has_table_privilege('service_role','public.malachite_ai_review_queue','delete')
    and has_table_privilege('service_role','public.malachite_ai_settings','select')
    and has_table_privilege('service_role','public.malachite_ai_settings','update')) then
  raise exception 'service_role_ai_queue_privileges_missing';
 end if;
end
$acl$;

set local role service_role;
insert into public.malachite_ai_alerts(alert_key,severity,title,details)
values('ci:test-alert','info','CI test alert','{}'::jsonb);
insert into public.malachite_ai_review_queue(task_key,task_type,record_id,title,risk_level)
values('ci:test-task','support_review','1','CI test review','low');
update public.malachite_ai_alerts set status='resolved',resolved_at=now() where alert_key='ci:test-alert';
update public.malachite_ai_review_queue set status='approved',updated_at=now() where task_key='ci:test-task';
reset role;

do $functional$
begin
 if not exists(select 1 from public.malachite_ai_alerts where alert_key='ci:test-alert' and status='resolved' and resolved_at is not null) then
  raise exception 'ai_alert_service_write_failed';
 end if;
 if not exists(select 1 from public.malachite_ai_review_queue where task_key='ci:test-task' and status='approved') then
  raise exception 'ai_review_queue_service_write_failed';
 end if;
 begin
  insert into public.malachite_ai_alerts(alert_key,severity,title) values('ci:test-alert','warning','duplicate');
  raise exception 'ai_alert_key_must_be_unique';
 exception when unique_violation then
  null;
 end;
end
$functional$;
rollback;
