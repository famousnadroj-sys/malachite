begin;
insert into private.admins(user_id) values('50000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $admin$
begin
 if not private.is_admin() then raise exception 'allowlisted_admin_must_be_recognized'; end if;
 if has_table_privilege('authenticated','private.admins','select') then
  raise exception 'browser_must_not_read_admin_allowlist';
 end if;
 if has_function_privilege('anon','private.is_admin()','execute') then
  raise exception 'anon_must_not_execute_admin_check';
 end if;
end
$admin$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $member$
begin
 if private.is_admin() then raise exception 'ordinary_member_must_not_be_admin'; end if;
end
$member$;
reset role;
rollback;
