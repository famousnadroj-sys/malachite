drop policy if exists "participants read message receipts" on public.message_receipts;
create policy "participants read message receipts"
on public.message_receipts for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
drop policy if exists "recipient records delivery" on public.message_receipts;
create policy "recipient records delivery"
on public.message_receipts for insert to authenticated
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1 from public.messages m
    where m.id = message_id and m.de = sender_id and m.a = recipient_id
  )
);
drop policy if exists "recipient marks read" on public.message_receipts;
create policy "recipient marks read"
on public.message_receipts for update to authenticated
using ((select auth.uid()) = recipient_id)
with check (
  (select auth.uid()) = recipient_id
  and exists (
    select 1 from public.messages m
    where m.id = message_id and m.de = sender_id and m.a = recipient_id
  )
);