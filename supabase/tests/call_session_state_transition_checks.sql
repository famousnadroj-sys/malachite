begin;
insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Malachite-room-identity-test','audio','pending',now()+interval '2 minutes'),
 ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','Malachite-room-reject-test','video','pending',now()+interval '2 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $immutable$
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
    update public.call_sessions set expires_at=now()+interval '10 minutes' where id='40000000-0000-0000-0000-000000000001';
    raise exception 'call_expiry_rewrite_was_accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.call_sessions set ended_at=now() where id='40000000-0000-0000-0000-000000000001';
    raise exception 'call_ended_at_rewrite_was_accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.call_sessions set status='accepted' where id='40000000-0000-0000-0000-000000000001';
    raise exception 'caller_accepted_own_call_was_accepted';
  exception when insufficient_privilege then null;
  end;
end
$immutable$;

-- The provider is intentionally disabled. Accepting must fail closed, while
-- the caller may still end a pending session and the callee may reject it.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $accept_blocked$
begin
  begin
    perform public.update_my_call_session_status('40000000-0000-0000-0000-000000000001','accepted');
    raise exception 'accept_without_private_provider_was_allowed';
  exception when others then
    if sqlerrm<>'secure_call_provider_unavailable' then raise; end if;
  end;
end
$accept_blocked$;

select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
select public.update_my_call_session_status('40000000-0000-0000-0000-000000000001','ended');

select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
do $callee_expiry$
begin
  begin
    perform public.update_my_call_session_status('40000000-0000-0000-0000-000000000002','expired');
    raise exception 'callee_expired_own_incoming_call';
  exception when others then
    if sqlerrm<>'call_transition_forbidden' then raise; end if;
  end;
end
$callee_expiry$;
select public.update_my_call_session_status('40000000-0000-0000-0000-000000000002','rejected');

reset role;
do $final_state$
begin
 if (select status from public.call_sessions where id='40000000-0000-0000-0000-000000000001')<>'ended' then
  raise exception 'valid_call_end_transition_broken';
 end if;
 if (select status from public.call_sessions where id='40000000-0000-0000-0000-000000000002')<>'rejected' then
  raise exception 'valid_callee_reject_transition_broken';
 end if;
end
$final_state$;
rollback;
