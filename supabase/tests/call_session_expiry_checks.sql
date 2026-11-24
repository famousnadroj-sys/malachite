begin;

insert into public.call_sessions(id,status,expires_at)
values ('10000000-0000-0000-0000-000000000001','pending',now()-interval '1 minute');

do $$
begin
 begin
  update public.call_sessions
  set status='accepted'
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

insert into public.call_sessions(id,status,expires_at)
values ('10000000-0000-0000-0000-000000000002','pending',now()+interval '1 minute');

update public.call_sessions
set status='accepted'
where id='10000000-0000-0000-0000-000000000002';

do $$
begin
 if (select status from public.call_sessions where id='10000000-0000-0000-0000-000000000002')<>'accepted' then
  raise exception 'test_failed_valid_call_not_accepted';
 end if;
end
$$;

rollback;
