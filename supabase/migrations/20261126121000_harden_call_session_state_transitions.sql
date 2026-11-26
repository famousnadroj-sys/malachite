-- Prevent call participants from rewriting call identity, room, mode or expiry.
-- Only the callee may accept/reject; only the caller may expire; either participant
-- may end an active call. Service-role operations (auth.uid() IS NULL) remain available.
create or replace function private.guard_call_session_update()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $guard$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.caller_id is distinct from old.caller_id
     or new.callee_id is distinct from old.callee_id
     or new.room is distinct from old.room
     or new.mode is distinct from old.mode
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at
     or new.ended_at is distinct from old.ended_at then
    raise exception 'call_session_identity_immutable' using errcode = '42501';
  end if;

  if v_uid not in (old.caller_id, old.callee_id) then
    raise exception 'call_session_participant_required' using errcode = '42501';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' then
    if new.status in ('accepted', 'rejected') and v_uid <> old.callee_id then
      raise exception 'only_callee_can_answer_call' using errcode = '42501';
    elsif new.status = 'expired' and v_uid <> old.caller_id then
      raise exception 'only_caller_can_expire_call' using errcode = '42501';
    elsif new.status not in ('accepted', 'rejected', 'expired', 'ended') then
      raise exception 'invalid_call_status_transition' using errcode = '42501';
    end if;
  elsif old.status = 'accepted' then
    if new.status <> 'ended' then
      raise exception 'invalid_call_status_transition' using errcode = '42501';
    end if;
  else
    raise exception 'call_session_already_closed' using errcode = '42501';
  end if;

  new.ended_at := case when new.status in ('rejected', 'expired', 'ended') then now() else null end;
  return new;
end;
$guard$;

revoke all on function private.guard_call_session_update() from public, anon, authenticated;

drop trigger if exists guard_call_session_update on public.call_sessions;
create trigger guard_call_session_update
before update on public.call_sessions
for each row execute function private.guard_call_session_update();
