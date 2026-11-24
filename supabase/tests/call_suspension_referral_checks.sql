begin;
insert into public.profiles(id,prenom,username,profile_private) values
 ('00000000-0000-0000-0000-000000000001','Caller','caller',false),
 ('00000000-0000-0000-0000-000000000002','Callee','callee',false),
 ('00000000-0000-0000-0000-000000000003','Private','private_user',true),
 ('00000000-0000-0000-0000-000000000004','Suspended','suspended_user',false);
insert into public.statuts values ('00000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.avis_match values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',true);
insert into public.suspensions values ('00000000-0000-0000-0000-000000000004');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$
begin
  begin
    perform * from public.start_call_session('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','room-suspended-001','audio',now()+interval '1 minute');
    raise exception 'test_failed_suspended_callee_started_call';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'call_account_suspended' then raise; end if;
  end;
  if exists(select 1 from public.get_malachite_referrer_preview('00000000-0000-0000-0000-000000000004')) then
    raise exception 'test_failed_suspended_referrer_visible';
  end if;
  if exists(select 1 from public.get_malachite_referrer_preview('00000000-0000-0000-0000-000000000003')) then
    raise exception 'test_failed_private_referrer_visible';
  end if;
  insert into public.blocages values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');
  if exists(select 1 from public.get_malachite_referrer_preview('00000000-0000-0000-0000-000000000002')) then
    raise exception 'test_failed_blocked_referrer_visible';
  end if;
end $$;
delete from public.blocages;
insert into public.suspensions values ('00000000-0000-0000-0000-000000000001');
do $$
begin
  begin
    perform * from public.start_call_session('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','room-suspended-002','audio',now()+interval '1 minute');
    raise exception 'test_failed_suspended_caller_started_call';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'call_account_suspended' then raise; end if;
  end;
end $$;
rollback;
