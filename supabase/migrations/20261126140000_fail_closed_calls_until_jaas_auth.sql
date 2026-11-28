-- Fail closed until Malachite has a verified JaaS JWT issuer and per-participant tokens.
-- Provider switch is private and defaults to OFF. No client role can change it.
create table if not exists private.call_provider_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
alter table private.call_provider_config enable row level security;

insert into private.call_provider_config(singleton,enabled)
values (true,false)
on conflict (singleton) do update set enabled=false;
revoke all on table private.call_provider_config from public, anon, authenticated;

create or replace function public.call_provider_is_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select enabled from private.call_provider_config where singleton=true
  ),false)
$$;
revoke all on function public.call_provider_is_enabled() from public, anon, authenticated;
grant execute on function public.call_provider_is_enabled() to service_role;

-- This intentionally disables call creation at the database boundary; no client-side
-- flag or UI override can re-enable public Jitsi rooms.
create or replace function public.start_call_session(
  p_id uuid,
  p_callee_id uuid,
  p_room text,
  p_mode text,
  p_expires_at timestamptz
)
returns setof public.call_sessions
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'secure_call_provider_not_configured';
end
$$;

revoke all on function public.start_call_session(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;

-- Revoke all direct client writes; status changes must use the narrow RPC below.
do $$
declare r record;
begin
  for r in
    select column_name, privilege_type, grantee
    from information_schema.column_privileges
    where table_schema='public' and table_name='call_sessions'
      and grantee in ('PUBLIC','anon','authenticated')
  loop
    execute format(
      'revoke %s (%I) on table public.call_sessions from %s',
      r.privilege_type, r.column_name,
      case when r.grantee='PUBLIC' then 'PUBLIC' else quote_ident(r.grantee) end
    );
  end loop;
end
$$;
revoke all privileges on table public.call_sessions from public, anon, authenticated;
grant select on table public.call_sessions to authenticated;

-- Close stale pending/accepted sessions left behind by expired public Jitsi rooms.
-- This is idempotent and runs only when the guarded migration is explicitly applied.
update public.call_sessions
set status = 'expired', ended_at = coalesce(ended_at, now())
where status in ('pending', 'accepted')
  and expires_at <= now();

-- A narrow participant RPC remains available for reject/end and, once the
-- provider switch is enabled, accept. It never exposes identity/room/expiry writes.
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

  update public.call_sessions set status=p_status
  where id=p_id
  returning * into v_session;
  return v_session;
end
$$;
revoke all on function public.update_my_call_session_status(uuid,text) from public, anon;
grant execute on function public.update_my_call_session_status(uuid,text) to authenticated;

-- Only the server-side token issuer may ask whether a participant can join.
create or replace function public.call_session_token_eligible(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.call_sessions s
    where s.id=p_session_id
      and p_user_id in (s.caller_id,s.callee_id)
      and s.status='accepted'
      and s.expires_at>now()
      and public.call_provider_is_enabled()
      and not private.is_suspended(s.caller_id)
      and not private.is_suspended(s.callee_id)
      and not exists (
        select 1
        from public.blocages b
        where (b.user_id=s.caller_id and b.cible=s.callee_id)
           or (b.user_id=s.callee_id and b.cible=s.caller_id)
      )
  )
$$;
revoke all on function public.call_session_token_eligible(uuid,uuid) from public, anon, authenticated;
grant execute on function public.call_session_token_eligible(uuid,uuid) to service_role;
