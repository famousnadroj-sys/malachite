begin;

insert into auth.users(id) values
 ('50000000-0000-0000-0000-000000000001'),
 ('60000000-0000-0000-0000-000000000001'),
 ('70000000-0000-0000-0000-000000000001'),
 ('80000000-0000-0000-0000-000000000001');
insert into public.profiles(id,prenom,username) values
 ('50000000-0000-0000-0000-000000000001','Caller','caller'),
 ('60000000-0000-0000-0000-000000000001','Callee','callee'),
 ('70000000-0000-0000-0000-000000000001','NoPass','nopass'),
 ('80000000-0000-0000-0000-000000000001','Peer','peer');
insert into public.statuts(user_id,premium_until)
values ('50000000-0000-0000-0000-000000000001',now()+interval '30 days');
insert into public.avis_match(user_id,autre,ok) values
 ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',true),
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',true),
 ('70000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',true),
 ('80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001',true);

update private.call_provider_config set enabled=false where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $closed$
begin
 if not has_function_privilege('authenticated','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE')
    or has_function_privilege('anon','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE') then
   raise exception 'call_creation_rpc_grants_invalid';
 end if;
 begin
  perform public.start_call_session(
   '90000000-0000-4000-8000-000000000001',
   '60000000-0000-0000-0000-000000000001',
   'Malachite-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
   'audio',
   now()+interval '90 seconds'
  );
  raise exception 'call_creation_must_fail_when_provider_disabled';
 exception when sqlstate '55000' then
  if sqlerrm <> 'secure_call_provider_unavailable' then raise; end if;
 end;
end
$closed$;
reset role;

update private.call_provider_config set enabled=true where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
select public.start_call_session(
 '90000000-0000-4000-8000-000000000001',
 '60000000-0000-0000-0000-000000000001',
 'Malachite-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 'audio',
 now()+interval '90 seconds'
);
reset role;

do $created$
begin
 if not exists(select 1 from public.call_sessions where id='90000000-0000-4000-8000-000000000001' and status='pending') then
  raise exception 'valid_mutual_match_call_not_created';
 end if;
end
$created$;

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $duplicate$
begin
 begin
  perform public.start_call_session(
   '90000000-0000-4000-8000-000000000002',
   '60000000-0000-0000-0000-000000000001',
   'Malachite-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
   'video',
   now()+interval '90 seconds'
  );
  raise exception 'duplicate_active_call_not_rejected';
 exception when sqlstate '55000' then
  if sqlerrm <> 'call_already_active' then raise; end if;
 end;
end
$duplicate$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true);
do $no_entitlement$
begin
 begin
  perform public.start_call_session(
   '90000000-0000-4000-8000-000000000003',
   '80000000-0000-0000-0000-000000000001',
   'Malachite-cccccccccccccccccccccccccccccccc',
   'video',
   now()+interval '90 seconds'
  );
  raise exception 'missing_entitlement_not_rejected';
 exception when insufficient_privilege then
  if sqlerrm <> 'call_entitlement_required' then raise; end if;
 end;
end
$no_entitlement$;
reset role;

insert into public.blocages(user_id,cible)
values ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $blocked$
begin
 begin
  perform public.start_call_session(
   '90000000-0000-4000-8000-000000000004',
   '60000000-0000-0000-0000-000000000001',
   'Malachite-dddddddddddddddddddddddddddddddd',
   'video',
   now()+interval '90 seconds'
  );
  raise exception 'blocked_call_not_rejected';
 exception when insufficient_privilege then
  if sqlerrm <> 'call_blocked' then raise; end if;
 end;
end
$blocked$;
reset role;

delete from public.blocages;
insert into public.suspensions(user_id) values ('60000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $suspended$
begin
 begin
  perform public.start_call_session(
   '90000000-0000-4000-8000-000000000005',
   '60000000-0000-0000-0000-000000000001',
   'Malachite-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
   'video',
   now()+interval '90 seconds'
  );
  raise exception 'suspended_call_not_rejected';
 exception when insufficient_privilege then
  if sqlerrm <> 'call_participant_suspended' then raise; end if;
 end;
end
$suspended$;
reset role;

rollback;
