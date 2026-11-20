create or replace function private.check_my_entitlement_expirations()
returns integer language plpgsql security definer set search_path=''
as $function$
begin
 if (select auth.uid()) is null then raise exception 'not_authenticated';end if;
 insert into public.user_notifications(user_id,kind,title,body,related_payment_id)
 select p.user_id,'entitlement_expired',
  case p.offre when 'Premium' then 'Ton abonnement Premium est terminé' when 'Appels' then 'Ton Pass Appels est terminé' when 'Boost' then 'Ton Boost est terminé' else 'Ton avantage est terminé' end,
  case p.offre
   when 'Premium' then 'Tes avantages Premium ont expiré. Renouvelle Premium à 3 USD pour 30 jours. Les appels audio et vidéo sont inclus dans Premium.'
   when 'Appels' then 'Tes 7 jours d’appels audio et vidéo sont terminés. Renouvelle le Pass Appels à 1 USD pour 7 jours, ou passe à Premium : les appels y sont inclus.'
   when 'Boost' then 'Tes 24 heures de mise en avant sont terminées. Tu peux relancer un Boost à 0,50 USD pour 24 heures.'
   else 'La durée de cet avantage est terminée.' end,p.id
 from public.paiements p where p.user_id=(select auth.uid()) and p.statut='valide'
  and p.offre in ('Premium','Appels','Boost','Badge Vérifié') and p.entitlement_expires_at is not null
  and p.entitlement_expires_at<=now() and p.expiry_notified_at is null
  and not private.entitlement_is_active(p.user_id,p.offre)
 on conflict(user_id,related_payment_id,kind) do nothing;
 update public.paiements p set expiry_notified_at=now()
 where p.user_id=(select auth.uid()) and p.statut='valide'
  and p.offre in ('Premium','Appels','Boost','Badge Vérifié') and p.entitlement_expires_at is not null
  and p.entitlement_expires_at<=now() and p.expiry_notified_at is null;
 return 1;
end $function$;
revoke all on function private.check_my_entitlement_expirations() from public,anon;
grant execute on function private.check_my_entitlement_expirations() to authenticated;
create or replace function public.check_my_entitlement_expirations()
returns integer language sql security invoker set search_path=''
as $function$ select private.check_my_entitlement_expirations() $function$;
revoke all on function public.check_my_entitlement_expirations() from public,anon;
grant execute on function public.check_my_entitlement_expirations() to authenticated;
revoke all on function private.process_expired_entitlements() from public,anon,authenticated;
revoke all on function private.entitlement_is_active(uuid,text) from public,anon,authenticated;
revoke all on function private.notify_payment_status_change() from public,anon,authenticated;
