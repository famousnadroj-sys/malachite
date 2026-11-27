-- Re-enable the existing call-creation RPC only behind the private JaaS provider switch.
-- The switch remains OFF by default; with it OFF every authenticated request fails closed.
-- Once the owner configures and verifies JaaS, the existing client flow can create
-- a pending session and obtain participant-scoped tokens from malachite-jaas-token.
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
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.call_provider_is_enabled() then
    raise exception 'secure_call_provider_unavailable' using errcode = '55000';
  end if;

  if p_id is null or p_callee_id is null or p_callee_id = v_uid then
    raise exception 'invalid_call_participants' using errcode = '22023';
  end if;
  if p_mode is null or p_mode not in ('audio','video') then
    raise exception 'invalid_call_mode' using errcode = '22023';
  end if;
  if p_room is null or p_room !~ '^Malachite-[a-f0-9]{32}$' then
    raise exception 'invalid_call_room' using errcode = '22023';
  end if;
  if p_expires_at is null or p_expires_at <= now()
     or p_expires_at > now() + interval '90 seconds' then
    raise exception 'invalid_call_expiry' using errcode = '22023';
  end if;

  -- Serialize calls involving either participant, regardless of which peer
  -- they attempt to call concurrently. Stable lock order avoids deadlocks.
  if v_uid::text < p_callee_id::text then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_callee_id::text, 0));
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_callee_id::text, 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  end if;

  if not exists(select 1 from public.profiles p where p.id = v_uid)
     or not exists(select 1 from public.profiles p where p.id = p_callee_id) then
    raise exception 'call_profile_not_found' using errcode = '23503';
  end if;
  if private.is_suspended(v_uid) or private.is_suspended(p_callee_id) then
    raise exception 'call_participant_suspended' using errcode = '42501';
  end if;
  if private.is_blocked_with(p_callee_id) then
    raise exception 'call_blocked' using errcode = '42501';
  end if;

  if not (
    exists(
      select 1 from public.statuts s
      where s.user_id = v_uid and s.premium_until > now()
    )
    or exists(
      select 1 from public.paiements pay
      where pay.user_id = v_uid
        and pay.offre = 'Appels'
        and pay.statut = 'valide'
        and coalesce(
          pay.entitlement_expires_at,
          pay.reviewed_at + interval '7 days',
          pay.created_at + interval '7 days'
        ) > now()
    )
  ) then
    raise exception 'call_entitlement_required' using errcode = '42501';
  end if;

  if not exists(
    select 1 from public.avis_match a
    where a.user_id = v_uid and a.autre = p_callee_id and a.ok = true
  ) or not exists(
    select 1 from public.avis_match a
    where a.user_id = p_callee_id and a.autre = v_uid and a.ok = true
  ) then
    raise exception 'mutual_match_required' using errcode = '42501';
  end if;

  if exists(
    select 1 from public.call_sessions cs
    where (cs.caller_id in (v_uid, p_callee_id)
       or cs.callee_id in (v_uid, p_callee_id))
      and cs.status in ('pending','accepted')
      and cs.expires_at > now()
  ) then
    raise exception 'call_already_active' using errcode = '55000';
  end if;

  return query
    insert into public.call_sessions(id, caller_id, callee_id, room, mode, status, expires_at)
    values (p_id, v_uid, p_callee_id, p_room, p_mode, 'pending', p_expires_at)
    returning *;
end;
$$;

revoke all on function public.start_call_session(uuid,uuid,text,text,timestamptz)
  from public, anon;
grant execute on function public.start_call_session(uuid,uuid,text,text,timestamptz)
  to authenticated;
