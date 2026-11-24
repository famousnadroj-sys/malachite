begin;
insert into public.profiles(id,prenom,username,profile_private) values
 ('10000000-0000-0000-0000-000000000001','Active','active_user',false),
 ('20000000-0000-0000-0000-000000000001','Suspended','suspended_user',false),
 ('30000000-0000-0000-0000-000000000001','Private','private_user',true);
insert into public.suspensions(user_id) values ('20000000-0000-0000-0000-000000000001');
insert into public.statuts(user_id,premium_until) values ('10000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.avis_match(user_id,autre,ok) values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.get_malachite_referrer_preview('20000000-0000-0000-0000-000000000001')) then
   raise exception 'suspended_referrer_preview_leaked';
 end if;
 if exists(select 1 from public.get_malachite_referrer_preview('30000000-0000-0000-0000-000000000001')) then
   raise exception 'private_referrer_preview_leaked';
 end if;
 begin
   perform * from public.start_call_session(
     '90000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     'room-suspended-callee-001','audio',now()+interval '1 minute');
   raise exception 'suspended_callee_call_was_allowed';
 exception when sqlstate 'P0001' then
   if sqlerrm <> 'callee_suspended' then raise; end if;
 end;
end $$;
reset role;
insert into public.suspensions(user_id) values ('10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin
   perform * from public.start_call_session(
     '90000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     'room-suspended-caller-01','audio',now()+interval '1 minute');
   raise exception 'suspended_caller_call_was_allowed';
 exception when sqlstate 'P0001' then
   if sqlerrm <> 'caller_suspended' then raise; end if;
 end;
end $$;
rollback;
