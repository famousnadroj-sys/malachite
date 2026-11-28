-- Keep anonymous referral previews public-only, and prevent authenticated
-- members from seeing a referrer who has blocked them or whom they blocked.
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
    and not exists (
      select 1 from public.suspensions s where s.user_id = p.id
    )
    and (
      (select auth.uid()) is null
      or not exists (
        select 1
        from public.blocages b
        where (b.user_id = (select auth.uid()) and b.cible = p.id)
           or (b.user_id = p.id and b.cible = (select auth.uid()))
      )
    )
  limit 1
$function$;

revoke all on function public.get_malachite_referrer_preview(uuid) from public;
grant execute on function public.get_malachite_referrer_preview(uuid) to anon, authenticated;
