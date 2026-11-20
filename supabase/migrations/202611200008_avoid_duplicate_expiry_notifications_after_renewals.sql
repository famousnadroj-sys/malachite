create or replace function private.entitlement_is_active(uid uuid,offer_name text)
returns boolean language sql stable set search_path=''
as $function$
 select case offer_name
  when 'Premium' then exists(select 1 from public.statuts s where s.user_id=uid and s.premium_until>now())
  when 'Boost' then exists(select 1 from public.statuts s where s.user_id=uid and s.boost_until>now())
  when 'Badge Vérifié' then exists(select 1 from public.statuts s where s.user_id=uid and s.verified_until>now())
  when 'Appels' then exists(select 1 from public.statuts s where s.user_id=uid and s.premium_until>now())
   or exists(select 1 from public.paiements p where p.user_id=uid and p.offre='Appels' and p.statut='valide' and p.entitlement_expires_at>now())
  else false end
$function$;
create or replace function private.process_expired_entitlements()
returns integer language plpgsql security definer set search_path=''
as $function$
declare affected integer;
begin
 insert into public.user_notifications(user_id,kind,title,body,related_payment_id)
 select p.user_id,'entitlement_expired',
  case p.offre when 'Premium' then 'Ton abonnement Premium est terminé' when 'Appels' then 'Ton Pass Appels est terminé' when 'Boost' then 'Ton Boost est terminé' else 'Ton avantage est terminé' end,
  case p.offre
   when 'Premium' then 'Tes avantages Premium ont expiré. Renouvelle Premium à 3 USD pour 30 jours. Les appels audio et vidéo sont inclus dans Premium.'
   when 'Appels' then 'Tes 7 jours d’appels audio et vidéo sont terminés. Renouvelle le Pass Appels à 1 USD pour 7 jours, ou passe à Premium : les appels y sont inclus.'
   when 'Boost' then 'Tes 24 heures de mise en avant sont terminées. Tu peux relancer un Boost à 0,50 USD pour 24 heures.'
   else 'La durée de cet avantage est terminée.' end,p.id
 from public.paiements p where p.statut='valide' and p.offre in ('Premium','Appels','Boost','Badge Vérifié')
  and p.entitlement_expires_at is not null and p.entitlement_expires_at<=now() and p.expiry_notified_at is null
  and not private.entitlement_is_active(p.user_id,p.offre)
 on conflict(user_id,related_payment_id,kind) do nothing;
 update public.paiements p set expiry_notified_at=now()
 where p.statut='valide' and p.offre in ('Premium','Appels','Boost','Badge Vérifié')
  and p.entitlement_expires_at is not null and p.entitlement_expires_at<=now() and p.expiry_notified_at is null;
 get diagnostics affected=row_count;return affected;
end $function$;
create or replace function public.check_my_entitlement_expirations()
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
