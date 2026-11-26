create or replace function private.process_expired_entitlements()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare affected integer;
begin
 insert into public.user_notifications(user_id,kind,title,body,related_payment_id)
 select p.user_id,'entitlement_expired',
  case p.offre when 'Premium' then 'Ton abonnement Premium est terminé' when 'Appels' then 'Ton accès aux appels est terminé' when 'Boost' then 'Ton Boost est terminé' else 'Ton avantage est terminé' end,
  case p.offre
   when 'Premium' then 'Tes avantages Premium ont expiré. Consulte la page Offres pour renouveler Premium. Les appels audio et vidéo sont inclus dans Premium.'
   when 'Appels' then 'Ton accès aux appels audio et vidéo est terminé. Consulte la page Offres pour le renouveler, ou passe à Premium : les appels y sont inclus.'
   when 'Boost' then 'Ton Boost de visibilité est terminé. Tu peux en activer un autre depuis la page Offres.'
   else 'La durée de cet avantage est terminée.' end,p.id
 from public.paiements p
 where p.statut='valide' and p.offre in ('Premium','Appels','Boost','Badge Vérifié')
  and p.entitlement_expires_at is not null and p.entitlement_expires_at<=now() and p.expiry_notified_at is null
  and not private.entitlement_is_active(p.user_id,p.offre)
 on conflict(user_id,related_payment_id,kind) do nothing;
 update public.paiements p set expiry_notified_at=now()
 where p.statut='valide' and p.offre in ('Premium','Appels','Boost','Badge Vérifié')
  and p.entitlement_expires_at is not null and p.entitlement_expires_at<=now() and p.expiry_notified_at is null;
 get diagnostics affected=row_count;return affected;
end $function$;
