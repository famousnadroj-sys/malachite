begin;
do $acl$
begin
 if not (select relrowsecurity from pg_class where oid='public.admin_push_queue'::regclass) then
  raise exception 'push_queue_rls_must_be_enabled';
 end if;
 if not (select relrowsecurity from pg_class where oid='public.admin_push_subscriptions'::regclass) then
  raise exception 'push_subscriptions_rls_must_be_enabled';
 end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('admin_push_queue','admin_push_subscriptions')) then
  raise exception 'push_tables_must_have_no_browser_policies';
 end if;
 if has_table_privilege('authenticated','public.admin_push_queue','select')
    or has_table_privilege('authenticated','public.admin_push_subscriptions','select') then
  raise exception 'authenticated_must_not_read_push_tables';
 end if;
 if not (has_table_privilege('service_role','public.admin_push_queue','select')
     and has_table_privilege('service_role','public.admin_push_queue','insert')
     and has_table_privilege('service_role','public.admin_push_queue','update')
     and has_table_privilege('service_role','public.admin_push_queue','delete'))
    or not (has_table_privilege('service_role','public.admin_push_subscriptions','select')
     and has_table_privilege('service_role','public.admin_push_subscriptions','insert')
     and has_table_privilege('service_role','public.admin_push_subscriptions','update')
     and has_table_privilege('service_role','public.admin_push_subscriptions','delete')) then
  raise exception 'service_role_push_table_privileges_missing';
 end if;
 if has_function_privilege('authenticated','public.get_malachite_push_secrets()','execute') then
  raise exception 'push_secrets_rpc_must_not_be_executable_by_members';
 end if;
 if not has_function_privilege('service_role','public.get_malachite_push_secrets()','execute') then
  raise exception 'push_secrets_rpc_service_role_grant_missing';
 end if;
 if not exists(select 1 from cron.job where jobname='malachite-admin-payment-push-batch' and schedule='*/5 * * * *' and active) then
  raise exception 'five_minute_fallback_dispatch_cron_missing';
 end if;
 if (select count(*) from cron.job where jobname='malachite-admin-payment-push-batch')<>1 then
  raise exception 'fallback_cron_must_not_duplicate';
 end if;
 if not exists(select 1 from cron.job where jobname='malachite-admin-payment-push-batch'
   and command ilike '%exists(select 1 from public.admin_push_queue where delivered_at is null)%'
   and command ilike '%exists(select 1 from public.admin_push_subscriptions where revoked_at is null)%') then
  raise exception 'fallback_cron_must_skip_idle_queue_and_missing_devices';
 end if;
 if coalesce((select public.get_malachite_push_secrets()->>'malachite_push_hook'),'')='' then
  raise exception 'vault_hook_secret_must_be_created';
 end if;
end
$acl$;

select vault.create_secret('https://staging-test.supabase.co','malachite_push_project_url','Environment-specific Supabase URL for isolated test');

insert into public.admin_push_subscriptions(admin_user_id,endpoint,p256dh,auth_key)
values('50000000-0000-0000-0000-000000000001','https://push.example/endpoint','p256dh-test','auth-test');
insert into public.paiements default values;

do $dispatch$
declare v_payment bigint;
begin
 select payment_id into v_payment from public.admin_push_queue limit 1;
 if v_payment is null then raise exception 'payment_insert_must_queue_admin_push'; end if;
 if not exists(
   select 1 from net.requests
   where body->>'action'='payment'
     and (body->>'payment_id')::bigint=v_payment
     and url='https://staging-test.supabase.co/functions/v1/malachite-admin-push'
     and coalesce(headers->>'x-malachite-hook','')<>''
 ) then
  raise exception 'payment_insert_must_dispatch_to_environment_scoped_signed_push';
 end if;
end
$dispatch$;

-- Missing project URL must never fall back to a hard-coded production endpoint.
delete from vault.secrets where name='malachite_push_project_url';
insert into public.paiements default values;
do $no_url$
begin
 if (select count(*) from public.admin_push_queue)<>2 then
  raise exception 'payment_without_push_url_must_remain_queued';
 end if;
 if (select count(*) from net.requests where body->>'action'='payment')<>1 then
  raise exception 'payment_without_project_url_must_not_call_any_environment';
 end if;
end
$no_url$;

update public.admin_push_subscriptions set revoked_at=now();
insert into public.paiements default values;
do $no_subs$
begin
 if (select count(*) from public.admin_push_queue)<>2 then
  raise exception 'no_active_subscription_must_not_enqueue_push';
 end if;
end
$no_subs$;
rollback;
