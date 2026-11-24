-- Keep call identity, room and timing metadata immutable after creation.
-- ended_at is assigned by this trigger only when a terminal state is reached.
create or replace function private.guard_call_session_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if new.id is distinct from old.id
    or new.caller_id is distinct from old.caller_id
    or new.callee_id is distinct from old.callee_id
    or new.room is distinct from old.room
    or new.mode is distinct from old.mode
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at
    or new.ended_at is distinct from old.ended_at then
  raise exception 'call_session_immutable_fields';
 end if;
 if old.status in ('rejected','ended','expired') then raise exception 'call_session_closed'; end if;
 if old.status='pending' and new.status not in ('accepted','rejected','ended','expired') then raise exception 'invalid_call_transition'; end if;
 if old.status='accepted' and new.status<>'ended' then raise exception 'invalid_call_transition'; end if;
 if auth.uid()=old.caller_id and new.status in ('accepted','rejected') then raise exception 'only_callee_can_answer'; end if;
 if auth.uid()=old.callee_id and new.status='expired' then raise exception 'callee_cannot_expire_call'; end if;
 if new.status in ('ended','rejected','expired') then new.ended_at=now(); end if;
 return new;
end
$$;
