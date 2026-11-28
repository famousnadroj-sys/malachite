-- Suspended members must not read or initiate conversations. Enforce this
-- at the message RLS boundary, not only in the browser or media storage.
-- Check account existence without depending on public profile visibility:
-- private profiles must remain able to chat with existing conversation partners.
create or replace function private.account_exists(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$  select p_user_id is not null
     and exists (select 1 from auth.users u where u.id = p_user_id)
$$;
revoke all on function private.account_exists(uuid) from public, anon;
grant execute on function private.account_exists(uuid) to authenticated;

drop policy if exists "lire ses messages" on public.messages;
create policy "lire ses messages"
on public.messages
for select
to authenticated
using (
  (de = (select auth.uid()) or a = (select auth.uid()))
  and not private.is_blocked_with(
    case when de = (select auth.uid()) then a else de end
  )
  and not private.is_suspended((select auth.uid()))
  and not private.is_suspended(
    case when de = (select auth.uid()) then a else de end
  )
);

drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message"
on public.messages
for insert
to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and not private.is_blocked_with(a)
  and not private.is_suspended((select auth.uid()))
  and not private.is_suspended(a)
  and private.account_exists(a)
);
