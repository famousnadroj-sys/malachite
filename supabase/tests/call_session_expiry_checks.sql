begin;

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','room-expired','audio','pending',now()-interval '1 minute');

do $$
begin
 begin
  update public.call_sessions set status='accepted'
  where id='10000000-0000-0000-0000-000000000001';
  raise exception 'test_failed_expired_call_was_accepted';
 exception when sqlstate 'P0001' then
  if sqlerrm<>'call_session_expired' then raise; end if;
 end;
 if (select status from public.call_sessions where id='10000000-0000-0000-0000-000000000001')<>'pending' then
  raise exception 'test_failed_expired_call_status_changed';
 end if;
end
$$;

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','room-valid','audio','pending',now()+interval '1 minute');

update public.call_sessions set status='accepted'
where id='10000000-0000-0000-0000-000000000002';

update public.call_sessions set status='ended'
where id='10000000-0000-0000-0000-000000000002';

do $$
begin
 if (select status from public.call_sessions where id='10000000-0000-0000-0000-000000000002')<>'ended' then
  raise exception 'test_failed_valid_call_transition_broken';
 end if;
end
$$;

-- Expiry/rejection of a pending call must remain allowed by the old guard.
insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','room-expire-transition','audio','pending',now()-interval '1 minute');

update public.call_sessions set status='expired'
where id='10000000-0000-0000-0000-000000000003';

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004','room-reject-transition','audio','pending',now()+interval '1 minute');

update public.call_sessions set status='rejected'
where id='10000000-0000-0000-0000-000000000004';

rollback;
