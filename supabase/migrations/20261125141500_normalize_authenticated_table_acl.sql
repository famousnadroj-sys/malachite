-- Normalize effective authenticated ACLs after the earlier targeted revokes.
-- Keep only the client operations still required while payments/calls remain
-- paused: SELECT on permitted history/profile tables. Payment intake and all
-- call-session writes stay disabled; call transitions use the checked RPC.
do $$
declare
  r record;
begin
  for r in
    select table_schema, table_name, column_name, privilege_type
    from information_schema.column_privileges
    where grantee in ('PUBLIC','anon','authenticated')
      and table_schema = 'public'
      and table_name = any (array[
        'call_sessions','config','login_names','paiements','statuts','prives'
      ])
  loop
    execute format(
      'revoke %s (%I) on table %I.%I from authenticated',
      r.privilege_type, r.column_name, r.table_schema, r.table_name
    );
  end loop;

  revoke all privileges on table
    public.call_sessions, public.config, public.login_names,
    public.paiements, public.statuts, public.prives
  from public, anon, authenticated;

  grant select on table
    public.call_sessions, public.login_names,
    public.paiements, public.statuts, public.prives
  to authenticated;

  -- public.config contains payment destinations and remains hidden while
  -- intake is paused. Do not re-grant payment INSERT or call-session UPDATE.
end
$$;

create or replace function public.update_my_call_session_status(p_id uuid,p_status text)
returns public.call_sessions
language plpgsql
security definer
set search_path=''
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

  if p_status in ('accepted','rejected') then
    if v_session.callee_id<>v_uid or v_session.status<>'pending'
       or v_session.expires_at<=now() then
      raise exception 'call_transition_forbidden';
    end if;
  elsif p_status='expired' then
    if v_session.caller_id<>v_uid or v_session.status<>'pending'
       or v_session.expires_at>now()+interval '5 seconds' then
      raise exception 'call_transition_forbidden';
    end if;
  elsif p_status='ended' then
    if v_session.status not in ('pending','accepted') then
      raise exception 'call_transition_forbidden';
    end if;
  end if;

  update public.call_sessions set status=p_status where id=p_id
  returning * into v_session;
  return v_session;
end
$$;

-- Calls are paused pending the authenticated JaaS token service. Keep the
-- RPC defined for a later audited activation, but do not expose it now.
revoke all on function public.update_my_call_session_status(uuid,text) from public,anon,authenticated;
revoke all on function public.start_call_session(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
