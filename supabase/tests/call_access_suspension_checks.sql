begin;
insert into public.profiles(id,prenom,username,profile_private) values
 ('10000000-0000-0000-0000-000000000001','Active','active_user',false),
 ('20000000-0000-0000-0000-000000000001','Suspended','suspended_user',false),
 ('30000000-0000-0000-0000-000000000001','Private','private_user',true),
 ('40000000-0000-0000-0000-000000000001','Available','available_user',false);
insert into public.suspensions(user_id) values ('20000000-0000-0000-0000-000000000001');
insert into public.statuts(user_id,premium_until) values ('10000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.avis_match(user_id,autre,ok) values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true),
 ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',true),
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true);
do $provider$
begin
  if (select enabled from private.call_provider_config where singleton=true) then
    raise exception 'call_provider_must_default_to_disabled';
  end if;
end
$provider$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $disabled$
begin
  begin
    perform * from public.start_call_session(
      '90000000-0000-0000-0000-000000000006',
      '40000000-0000-0000-0000-000000000001',
      'room-provider-disabled-01','audio',now()+interval '1 minute');
    raise exception 'disabled_call_provider_created_session';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'secure_call_provider_unavailable' then raise; end if;
  end;
end
$disabled$;
reset role;
do $empty$
begin
  if exists(select 1 from public.call_sessions) then
    raise exception 'disabled_call_provider_left_session';
  end if;
end
$empty$;
update private.call_provider_config set enabled=true, updated_at=now() where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $ begin
 if exists(select 1 from public.get_malachite_referrer_preview('20000000-0000-0000-0000-000000000001')) then
   raise exception 'suspended_referrer_preview_leaked';
 end if;
 if exists(select 1 from public.get_malachite_referrer_preview('30000000-0000-0000-0000-000000000001')) then
   raise exception 'private_referrer_preview_leaked';
 end if;

 -- Active, public, unblocked referrals remain visible.
 if not exists (
   select 1 from public.get_malachite_referrer_preview('40000000-0000-0000-0000-000000000001')
   where prenom='Available' and username='available_user'
 ) then
   raise exception 'active_referrer_preview_regressed';
 end if;
 -- Blocking either direction must suppress the preview and prevent calls.
 insert into public.blocages(user_id,cible)
 values ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');
 if exists(select 1 from public.get_malachite_referrer_preview('40000000-0000-0000-0000-000000000001')) then
   raise exception 'viewer_blocked_referrer_preview_leaked';
 end if;
 begin
   perform * from public.start_call_session(
     '90000000-0000-0000-0000-000000000003',
     '40000000-0000-0000-0000-000000000001',
     'room-blocked-forward-01','audio',now()+interval '1 minute');
   raise exception 'viewer_blocked_call_was_allowed';
 exception when sqlstate 'P0001' then
   if sqlerrm <> 'call_blocked' then raise; end if;
 end;
 delete from public.blocages where user_id='10000000-0000-0000-0000-000000000001';
 insert into public.blocages(user_id,cible)
 values ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
 if exists(select 1 from public.get_malachite_referrer_preview('40000000-0000-0000-0000-000000000001')) then
   raise exception 'referrer_blocked_viewer_preview_leaked';
 end if;
 begin
   perform * from public.start_call_session(
     '90000000-0000-0000-0000-000000000004',
     '40000000-0000-0000-0000-000000000001',
     'room-blocked-reverse-01','audio',now()+interval '1 minute');
   raise exception 'reverse_blocked_call_was_allowed';
 exception when sqlstate 'P0001' then
   if sqlerrm <> 'call_blocked' then raise; end if;
 end;
 delete from public.blocages
 where user_id='40000000-0000-0000-0000-000000000001'
   and cible='10000000-0000-0000-0000-000000000001';
 if not exists (
   select 1 from public.start_call_session(
     '90000000-0000-0000-0000-000000000005',
     '40000000-0000-0000-0000-000000000001',
     'room-valid-mutual-match-01','audio',now()+interval '1 minute')
   where status='pending'
 ) then
   raise exception 'valid_mutual_match_call_was_rejected';
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
     '40000000-0000-0000-0000-000000000001',
     'room-suspended-caller-01','audio',now()+interval '1 minute');
   raise exception 'suspended_caller_call_was_allowed';
 exception when sqlstate 'P0001' then
   if sqlerrm <> 'caller_suspended' then raise; end if;
 end;
end $$;
rollback;
