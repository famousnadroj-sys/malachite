begin;
insert into private.admins(user_id) values('50000000-0000-0000-0000-000000000001');
set local role service_role;
insert into public.admin_actions(admin_id,action,cible,details)
values('50000000-0000-0000-0000-000000000001','ci:test','60000000-0000-0000-0000-000000000001','{}'::jsonb);
insert into public.ai_manager_audit(admin_id,model,status,input_chars,output_chars)
values('50000000-0000-0000-0000-000000000001','ci-model','success',1,1);
reset role;

do $acl$
begin
 if not (select relrowsecurity from pg_class where oid='private.admins'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.admin_actions'::regclass) then
  raise exception 'admin_tables_rls_must_be_enabled';
 end if;
 if has_table_privilege('authenticated','private.admins','select') then
  raise exception 'members_must_not_read_admin_allowlist';
 end if;
 if not has_function_privilege('authenticated','private.is_admin()','execute')
    or has_function_privilege('anon','private.is_admin()','execute') then
  raise exception 'is_admin_rpc_grants_are_wrong';
 end if;
 if not has_table_privilege('authenticated','public.admin_actions','select')
    or has_table_privilege('authenticated','public.admin_actions','insert') then
  raise exception 'admin_audit_browser_grants_are_wrong';
 end if;
 if not has_table_privilege('service_role','public.admin_actions','insert')
    or not has_table_privilege('service_role','public.admin_actions','select') then
  raise exception 'service_role_admin_audit_grants_missing';
 end if; if has_sequence_privilege('authenticated','public.ai_manager_audit_id_seq','usage')
    or not has_sequence_privilege('service_role','public.ai_manager_audit_id_seq','usage') then
  raise exception 'ai_manager_audit_sequence_must_be_service_role_only';
 end if;
end
$acl$;

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $admin_read$
begin
 if (select count(*) from public.admin_actions where action='ci:test')<>1 then
  raise exception 'allowlisted_admin_must_read_audit';
 end if;
end
$admin_read$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $member_denied$
begin
 if (select count(*) from public.admin_actions where action='ci:test')<>0 then
  raise exception 'non_admin_must_not_read_audit';
 end if;
end
$member_denied$;
reset role;

delete from auth.users where id='50000000-0000-0000-0000-000000000001';
delete from auth.users where id='60000000-0000-0000-0000-000000000001';
do $delete_cleanup$
begin
 if exists(select 1 from private.admins where user_id='50000000-0000-0000-0000-000000000001') then
  raise exception 'deleted_auth_user_must_leave_admin_allowlist';
 end if;
 if not exists(select 1 from public.admin_actions where action='ci:test' and admin_id is null and cible is null) then
  raise exception 'admin_audit_must_preserve_record_and_null_deleted_actor_and_target';
 end if;
 if not exists(select 1 from public.ai_manager_audit where model='ci-model' and admin_id is null) then
  raise exception 'ai_manager_audit_must_preserve_record_and_null_deleted_admin';
 end if;
end
$delete_cleanup$;
rollback;
