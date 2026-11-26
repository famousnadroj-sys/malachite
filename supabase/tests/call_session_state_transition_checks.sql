begin;
insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Malachite-room-identity-test','audio','pending',now()+interval '2 minutes'),
 ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','Malachite-room-reject-test','video','pending',now()+interval '2 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$
begin
 begin
  update public.call_sessions set room='attacker-room' where id='40000000-0000-0000-0000-000000000001';
  raise exception 'call_room_rewrite_was_accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.call_sessions set callee_id='50000000-0000-0000-0000-000000000001' where id='40000000-0000-0000-0000-000000000001';
  raise exception 'call_callee_rewrite_was_accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.call_sessions set status='accepted' where id='40000000-0000-0000-0000-000000000001';
  raise exception 'caller_accepted_own_call_was_accepted';
 exception when insufficient_privilege then null;
 end;
end
$$;

select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
update public.call_sessions set status='accepted' where id='40000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
update public.call_sessions set status='ended' where id='40000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000002',true);
do $$
begin
 begin
  update public.call_sessions set status='expired' where id='40000000-0000-0000-0000-000000000002';
  raise exception 'callee_expired_own_incoming_call';
 exception when insufficient_privilege then null;
 end;
end
$$;

select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
update public.call_sessions set status='rejected' where id='40000000-0000-0000-0000-000000000002';

reset role;
do $$
begin
 if (select status from public.call_sessions where id='40000000-0000-0000-0000-000000000001') <> 'ended' then
  raise exception 'valid_call_end_transition_broken';
 end if;
 if (select status from public.call_sessions where id='40000000-0000-0000-0000-000000000002') <> 'rejected' then
  raise exception 'valid_callee_reject_transition_broken';
 end if;
end
$$;
rollback;
