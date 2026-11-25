-- Keep exact entitlement timestamps private. The member client receives only
-- boolean badges for profiles that are public, not suspended and not blocked.
drop policy if exists "voir les statuts" on public.statuts;
create policy "read own entitlement status"
on public.statuts for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.public_status_badges()
returns table (
  user_id uuid,
  premium_active boolean,
  verified_active boolean,
  boost_active boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select s.user_id,
         coalesce(s.premium_until > now(), false),
         coalesce(s.verified_until > now(), false),
         coalesce(s.boost_until > now(), false)
  from public.statuts s
  join public.profiles p on p.id = s.user_id
  where (p.profile_private = false or s.user_id = (select auth.uid()))
    and not private.is_suspended(s.user_id)
    and (s.user_id = (select auth.uid()) or not private.is_blocked_with(s.user_id))
    and (select auth.uid()) is not null;
$function$;

revoke all on function public.public_status_badges() from public, anon;
grant execute on function public.public_status_badges() to authenticated;
