-- Apply suspension and block checks to direct call-session and appointment access.
-- The existing call-session trigger remains responsible for immutable fields and state transitions.

drop policy if exists "call participants can read" on public.call_sessions;
create policy "call participants can read"
on public.call_sessions for select to authenticated
using (
  (caller_id=(select auth.uid()) or callee_id=(select auth.uid()))
  and not private.is_suspended(caller_id)
  and not private.is_suspended(callee_id)
  and not private.is_blocked_with(case when caller_id=(select auth.uid()) then callee_id else caller_id end)
);

drop policy if exists "call participants can update" on public.call_sessions;
create policy "call participants can update"
on public.call_sessions for update to authenticated
using (
  (caller_id=(select auth.uid()) or callee_id=(select auth.uid()))
  and not private.is_suspended(caller_id)
  and not private.is_suspended(callee_id)
  and not private.is_blocked_with(case when caller_id=(select auth.uid()) then callee_id else caller_id end)
)
with check (
  (caller_id=(select auth.uid()) or callee_id=(select auth.uid()))
  and not private.is_suspended(caller_id)
  and not private.is_suspended(callee_id)
  and not private.is_blocked_with(case when caller_id=(select auth.uid()) then callee_id else caller_id end)
  and (
    status <> 'accepted'
    or exists (
      select 1 from private.call_provider_config c
      where c.singleton = true and c.enabled = true
    )
  )
);

drop policy if exists "paid matched members can call" on public.call_sessions;
create policy "paid matched members can call"
on public.call_sessions for insert to authenticated
with check (
  caller_id=(select auth.uid())
  and callee_id<>caller_id
  and status='pending'
  and expires_at>now()
  and expires_at<=now()+interval '3 minutes'
  and length(room) between 12 and 100
  and mode in ('audio','video')
  and not private.is_suspended(caller_id)
  and not private.is_suspended(callee_id)
  and exists(select 1 from public.profiles p where p.id=callee_id)
  and (
    exists(select 1 from public.statuts s where s.user_id=(select auth.uid()) and s.premium_until>now())
    or exists(select 1 from public.paiements pay where pay.user_id=(select auth.uid())
      and pay.offre='Appels' and pay.statut='valide'
      and coalesce(pay.entitlement_expires_at,pay.reviewed_at+interval '7 days',pay.created_at+interval '7 days')>now())
  )
  and exists(select 1 from public.avis_match a where a.user_id=(select auth.uid()) and a.autre=callee_id and a.ok=true)
  and exists(select 1 from public.avis_match a where a.user_id=callee_id and a.autre=(select auth.uid()) and a.ok=true)
  and not private.is_blocked_with(callee_id)
  and exists (
    select 1 from private.call_provider_config c
    where c.singleton = true and c.enabled = true
  )
);

drop policy if exists "creer un rdv" on public.rendez_vous;
create policy "creer un rdv"
on public.rendez_vous for insert to authenticated
with check (
  de=(select auth.uid())
  and a<>(select auth.uid())
  and statut='attente'
  and not private.is_blocked_with(a)
  and not private.is_suspended((select auth.uid()))
  and not private.is_suspended(a)
  and exists(select 1 from public.profiles p where p.id=a)
);

drop policy if exists "repondre a un rdv" on public.rendez_vous;
create policy "repondre a un rdv"
on public.rendez_vous for update to authenticated
using (
  a=(select auth.uid())
  and not private.is_suspended(a)
  and not private.is_suspended(de)
  and not private.is_blocked_with(de)
)
with check (
  a=(select auth.uid())
  and statut in ('confirme','refuse')
  and not private.is_suspended(a)
  and not private.is_suspended(de)
  and not private.is_blocked_with(de)
);

drop policy if exists "voir ses rdv" on public.rendez_vous;
create policy "voir ses rdv"
on public.rendez_vous for select to authenticated
using (
  (de=(select auth.uid()) or a=(select auth.uid()))
  and not private.is_suspended(de)
  and not private.is_suspended(a)
  and not private.is_blocked_with(case when de=(select auth.uid()) then a else de end)
);

-- The UI only changes the invitation status; do not grant update access to
-- sender, recipient, date, place, message, map URL, or creation timestamp.
grant update(statut) on public.rendez_vous to authenticated;
