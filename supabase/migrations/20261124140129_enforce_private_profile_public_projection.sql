-- Private profiles must not be discoverable by other authenticated accounts.
-- Keep the profile row and its data intact; RLS hides it from everyone except its owner.
drop policy if exists "voir profils" on public.profiles;
create policy "voir profils"
on public.profiles
for select
to authenticated
using (
 id = (select auth.uid())
 or (
  profile_private = false
  and not private.is_blocked_with(id)
  and not private.is_suspended(id)
 )
);
