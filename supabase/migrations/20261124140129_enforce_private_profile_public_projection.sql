-- Private profiles are visible only to their owner.
-- Keep profile data intact; row-level security hides the complete row from others.
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
