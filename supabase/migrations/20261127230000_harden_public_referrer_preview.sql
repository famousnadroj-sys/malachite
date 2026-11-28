-- Referral preview may expose only basic details of a public, non-suspended profile.
-- Authenticated viewers must not receive a referrer preview across a block.
create or replace function public.get_malachite_referrer_preview(p_referrer_id uuid)
returns table(prenom text, username text)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.prenom, p.username
  from public.profiles p
  where p.id = p_referrer_id
    and coalesce(p.profile_private, false) = false
    and not private.is_suspended(p.id)
    and (
      (select auth.uid()) is null
      or not private.is_blocked_with(p.id)
    )
  limit 1
$function$;

revoke all on function public.get_malachite_referrer_preview(uuid) from public;
grant execute on function public.get_malachite_referrer_preview(uuid) to anon, authenticated;