create index if not exists user_notifications_related_payment_idx
 on public.user_notifications(related_payment_id)
 where related_payment_id is not null;

drop policy if exists "call participants can read" on public.call_sessions;
create policy "call participants can read" on public.call_sessions
for select to authenticated
using ((select auth.uid())=caller_id or (select auth.uid())=callee_id);

drop policy if exists "call participants can update" on public.call_sessions;
create policy "call participants can update" on public.call_sessions
for update to authenticated
using ((select auth.uid())=caller_id or (select auth.uid())=callee_id)
with check ((select auth.uid())=caller_id or (select auth.uid())=callee_id);
