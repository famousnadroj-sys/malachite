-- Pending invitations expire after 90 seconds. Once accepted, the call receives
-- a bounded 60-minute active window so token refresh/reconnection is possible.
-- The provider must remain enabled; participants cannot extend the expiry directly.
create or replace function private.guard_call_session_update()
returns trigger
language plpgsql
security definer
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
     or new.ended_at is distinct from old.ended_at then
    raise exception 'call_session_identity_immutable' using errcode = '42501';
  end if;

  if v_uid not in (old.caller_id, old.callee_id) then
    raise exception 'call_session_participant_required' using errcode = '42501';
  end if;

  if new.status is not distinct from old.status then
    if new.expires_at is distinct from old.expires_at then
      raise exception 'call_session_identity_immutable' using errcode = '42501';
    end if;
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

    if new.status = 'accepted' then
      if not public.call_provider_is_enabled() then
        raise exception 'secure_call_provider_unavailable' using errcode = '55000';
      end if;
      if new.expires_at < now() + interval '59 minutes'
         or new.expires_at > now() + interval '60 minutes 5 seconds' then
        raise exception 'invalid_accepted_call_window' using errcode = '22023';
      end if;
    elsif new.expires_at is distinct from old.expires_at then
      raise exception 'call_session_identity_immutable' using errcode = '42501';
    end if;
  elsif old.status = 'accepted' then
    if new.status <> 'ended' then
      raise exception 'invalid_call_status_transition' using errcode = '42501';
    end if;
    if new.expires_at is distinct from old.expires_at then
      raise exception 'call_session_identity_immutable' using errcode = '42501';
    end if;
  else
    raise exception 'call_session_already_closed' using errcode = '42501';
  end if;

  new.ended_at := case when new.status in ('rejected', 'expired', 'ended') then now() else null end;
  return new;
end;
$guard$;

revoke all on function private.guard_call_session_update() from public, anon, authenticated;

create or replace function public.update_my_call_session_status(p_id uuid, p_status text)
returns public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.call_sessions;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_status is null or p_status not in ('accepted','rejected','expired','ended') then
    raise exception 'invalid_call_status';
  end if;

  select * into v_session
  from public.call_sessions
  where id=p_id and (caller_id=v_uid or callee_id=v_uid)
  for update;
  if not found then raise exception 'call_session_not_found'; end if;

  if private.is_suspended(v_session.caller_id)
     or private.is_suspended(v_session.callee_id) then
    raise exception 'call_participant_suspended';
  end if;
  if private.is_blocked_with(case when v_session.caller_id=v_uid then v_session.callee_id else v_session.caller_id end) then
    raise exception 'call_blocked';
  end if;

  if p_status in ('accepted','rejected') then
    if v_uid<>v_session.callee_id or v_session.status<>'pending'
       or v_session.expires_at<=now() then
      raise exception 'call_transition_forbidden';
    end if;
    if p_status='accepted' and not public.call_provider_is_enabled() then
      raise exception 'secure_call_provider_unavailable';
    end if;
  elsif p_status='expired' then
    if v_uid<>v_session.caller_id or v_session.status<>'pending'
       or v_session.expires_at>now()+interval '5 seconds' then
      raise exception 'call_transition_forbidden';
    end if;
  elsif p_status='ended' then
    if v_session.status not in ('pending','accepted') then
      raise exception 'call_transition_forbidden';
    end if;
  end if;

  update public.call_sessions
  set status=p_status,
      expires_at=case when p_status='accepted' then now()+interval '60 minutes' else expires_at end
  where id=p_id
  returning * into v_session;
  return v_session;
end
$$;

revoke all on function public.update_my_call_session_status(uuid,text) from public, anon;
grant execute on function public.update_my_call_session_status(uuid,text) to authenticated;
