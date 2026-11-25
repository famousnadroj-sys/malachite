-- Message delivery/read receipts are visible only while both conversation participants
-- remain active and unblocked. The client only needs to update read_at.
drop policy if exists "participants read message receipts" on public.message_receipts;
create policy "participants read message receipts"
on public.message_receipts for select to authenticated
using (
  (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
  and not private.is_suspended(sender_id)
  and not private.is_suspended(recipient_id)
  and not private.is_blocked_with(case when sender_id=(select auth.uid()) then recipient_id else sender_id end)
);

drop policy if exists "recipient records delivery" on public.message_receipts;
create policy "recipient records delivery"
on public.message_receipts for insert to authenticated
with check (
  recipient_id=(select auth.uid())
  and not private.is_suspended(recipient_id)
  and not private.is_suspended(sender_id)
  and not private.is_blocked_with(sender_id)
  and exists (
    select 1 from public.messages m
    where m.id=message_receipts.message_id
      and m.de=message_receipts.sender_id
      and m.a=message_receipts.recipient_id
  )
);

drop policy if exists "recipient marks read" on public.message_receipts;
create policy "recipient marks read"
on public.message_receipts for update to authenticated
using (
  recipient_id=(select auth.uid())
  and read_at is null
  and not private.is_suspended(recipient_id)
  and not private.is_suspended(sender_id)
  and not private.is_blocked_with(sender_id)
  and exists (
    select 1 from public.messages m
    where m.id=message_receipts.message_id
      and m.de=message_receipts.sender_id
      and m.a=message_receipts.recipient_id
  )
)
with check (
  recipient_id=(select auth.uid())
  and read_at is not null
  and not private.is_suspended(recipient_id)
  and not private.is_suspended(sender_id)
  and not private.is_blocked_with(sender_id)
  and exists (
    select 1 from public.messages m
    where m.id=message_receipts.message_id
      and m.de=message_receipts.sender_id
      and m.a=message_receipts.recipient_id
  )
);

grant update(read_at) on public.message_receipts to authenticated;
