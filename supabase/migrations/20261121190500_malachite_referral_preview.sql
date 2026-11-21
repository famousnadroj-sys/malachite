create or replace function public.get_malachite_referrer_preview(p_referrer_id uuid)
returns table(prenom text,username text)
language sql security definer set search_path=''
as $function$
  select p.prenom,p.username from public.profiles p
  where p.id=p_referrer_id and coalesce(p.profile_private,false)=false
  limit 1
$function$;
revoke all on function public.get_malachite_referrer_preview(uuid) from public;
grant execute on function public.get_malachite_referrer_preview(uuid) to anon, authenticated;
