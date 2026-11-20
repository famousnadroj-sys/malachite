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
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_callee_id is null or p_callee_id = v_uid then raise exception 'invalid_callee'; end if;
  if p_mode not in ('audio','video') then raise exception 'invalid_call_mode'; end if;
  if p_room is null or length(p_room) < 12 or length(p_room) > 100 then raise exception 'invalid_call_room'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '3 minutes' then raise exception 'invalid_call_expiry'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_callee_id) then raise exception 'callee_not_found'; end if;

  if not (
    exists (select 1 from public.statuts s where s.user_id = v_uid and s.premium_until > now())
    or exists (
      select 1 from public.paiements pay
      where pay.user_id = v_uid
        and pay.offre = 'Appels'
        and pay.statut = 'valide'
        and coalesce(pay.entitlement_expires_at, pay.reviewed_at + interval '7 days', pay.created_at + interval '7 days') > now()
    )
  ) then
    raise exception 'call_entitlement_required';
  end if;

  -- A mutual match is not sufficient when either member has blocked the other.
  if private.is_blocked_with(p_callee_id) then
    raise exception 'call_blocked';
  end if;

  if not exists (select 1 from public.avis_match a where a.user_id = v_uid and a.autre = p_callee_id and a.ok = true)
     or not exists (select 1 from public.avis_match a where a.user_id = p_callee_id and a.autre = v_uid and a.ok = true) then
    raise exception 'mutual_match_required';
  end if;

  if exists (
    select 1 from public.call_sessions cs
    where (cs.caller_id = v_uid or cs.callee_id = v_uid or cs.caller_id = p_callee_id or cs.callee_id = p_callee_id)
      and cs.status in ('pending','accepted')
      and cs.expires_at > now()
  ) then
    raise exception 'call_already_active';
  end if;

  return query
    insert into public.call_sessions(id, caller_id, callee_id, room, mode, status, expires_at)
    values (p_id, v_uid, p_callee_id, p_room, p_mode, 'pending', p_expires_at)
    returning *;
end
$$;

revoke all on function public.start_call_session(uuid,uuid,text,text,timestamptz) from public, anon;
grant execute on function public.start_call_session(uuid,uuid,text,text,timestamptz) to authenticated;

drop policy if exists "paid matched members can call" on public.call_sessions;
create policy "paid matched members can call"
on public.call_sessions
for insert
to authenticated
with check (
  caller_id = (select auth.uid())
  and status = 'pending'
  and expires_at > now()
  and expires_at <= now() + interval '3 minutes'
  and (
    exists (select 1 from public.statuts s where s.user_id = (select auth.uid()) and s.premium_until > now())
    or exists (
      select 1 from public.paiements pay
      where pay.user_id = (select auth.uid())
        and pay.offre = 'Appels'
        and pay.statut = 'valide'
        and coalesce(pay.entitlement_expires_at, pay.reviewed_at + interval '7 days', pay.created_at + interval '7 days') > now()
    )
  )
  and exists (
    select 1 from public.avis_match a
    where a.user_id = (select auth.uid()) and a.autre = call_sessions.callee_id and a.ok = true
  )
  and exists (
    select 1 from public.avis_match a
    where a.user_id = call_sessions.callee_id and a.autre = (select auth.uid()) and a.ok = true
  )
  and not private.is_blocked_with(call_sessions.callee_id)
);