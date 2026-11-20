-- Premium bundles calls, and payment/expiry notifications are persisted and scheduled.
alter table public.paiements
 add column if not exists entitlement_starts_at timestamptz,
 add column if not exists entitlement_expires_at timestamptz,
 add column if not exists expiry_notified_at timestamptz;
create index if not exists paiements_user_entitlement_idx on public.paiements(user_id,offre,statut,entitlement_expires_at desc);

create table if not exists public.user_notifications(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('payment_approved','payment_rejected','entitlement_expired')),
 title text not null,body text not null,
 related_payment_id bigint references public.paiements(id) on delete set null,
 created_at timestamptz not null default now(),read_at timestamptz,
 constraint user_notifications_payment_kind_unique unique(user_id,related_payment_id,kind)
);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id,created_at desc);
alter table public.user_notifications enable row level security;
drop policy if exists "users read own notifications" on public.user_notifications;
create policy "users read own notifications" on public.user_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "users mark own notifications read" on public.user_notifications;
create policy "users mark own notifications read" on public.user_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,update on public.user_notifications to authenticated;
grant usage,select on sequence public.user_notifications_id_seq to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then
  alter publication supabase_realtime add table public.user_notifications;
 end if;
end $$;

create or replace function private.notify_payment_status_change()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare title_text text;body_text text;kind_text text;
begin
 if new.statut is not distinct from old.statut then return new; end if;
 if new.statut='valide' then
  kind_text:='payment_approved';title_text:='Paiement validé';
  body_text:=case new.offre
   when 'Premium' then 'Ton abonnement Premium est activé pour 30 jours. Les appels audio et vidéo, les nouvelles conversations sans quota et les rendez-vous illimités sont inclus.'
   when 'Appels' then 'Ton Pass Appels audio et vidéo est activé pour 7 jours.'
   when 'Boost' then 'Ton Boost est activé pour 24 heures. Ton profil est mis en avant dans Découvrir.'
   when 'Badge Vérifié' then 'Ton badge vérifié est activé pour 14 jours.'
   when 'Contact' then 'Ton déblocage de contact a été activé.'
   else 'Ton avantage a été activé.' end;
  if new.entitlement_expires_at is not null then body_text:=body_text||' Expire le '||to_char(new.entitlement_expires_at at time zone 'UTC','DD/MM/YYYY à HH24:MI')||' UTC.';end if;
 elsif new.statut='rejete' then
  kind_text:='payment_rejected';title_text:='Paiement refusé';
  body_text:='Ta demande pour '||new.offre||' a été refusée. Motif : '||coalesce(new.admin_reason,'raison non précisée')||'.';
 else return new;end if;
 insert into public.user_notifications(user_id,kind,title,body,related_payment_id)
 values(new.user_id,kind_text,title_text,body_text,new.id)
 on conflict(user_id,related_payment_id,kind) do nothing;
 return new;
end $function$;
drop trigger if exists trg_notify_payment_status_change on public.paiements;
create trigger trg_notify_payment_status_change after update of statut on public.paiements for each row execute function private.notify_payment_status_change();

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
 from public.paiements p
 where p.statut='valide' and p.offre in ('Premium','Appels','Boost','Badge Vérifié')
  and p.entitlement_expires_at is not null and p.entitlement_expires_at<=now() and p.expiry_notified_at is null
  and not(p.offre='Appels' and exists(select 1 from public.statuts s where s.user_id=p.user_id and s.premium_until>now()))
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
  and not(p.offre='Appels' and exists(select 1 from public.statuts s where s.user_id=p.user_id and s.premium_until>now()))
 on conflict(user_id,related_payment_id,kind) do nothing;
 update public.paiements p set expiry_notified_at=now()
 where p.user_id=(select auth.uid()) and p.statut='valide'
  and p.offre in ('Premium','Appels','Boost','Badge Vérifié') and p.entitlement_expires_at is not null
  and p.entitlement_expires_at<=now() and p.expiry_notified_at is null;
 return 1;
end $function$;
revoke all on function public.check_my_entitlement_expirations() from public;
grant execute on function public.check_my_entitlement_expirations() to authenticated;

create or replace function private.traiter_paiement(pid bigint,accepter boolean,raison text)
returns text language plpgsql security definer set search_path=''
as $function$
declare p public.paiements%rowtype;motif text;starts_at timestamptz:=now();ends_at timestamptz;
begin
 if not private.is_admin() then raise exception 'interdit';end if;
 select * into p from public.paiements where id=pid and statut='attente' for update;
 if not found then return 'introuvable';end if;
 if p.offre not in ('Premium','Boost','Badge Vérifié','Contact','Appels') then raise exception 'offre_invalide';end if;
 if p.offre='Contact' and(p.cible is null or p.cible=p.user_id or not exists(select 1 from public.profiles where id=p.cible)) then raise exception 'cible_invalide';end if;
 if not accepter then
  motif:=nullif(left(btrim(coalesce(raison,'')),500),'');if motif is null then raise exception 'motif_refus_obligatoire';end if;
  update public.paiements set statut='rejete',admin_reason=motif,reviewed_at=now() where id=pid;
  insert into public.admin_actions(admin_id,action,cible,details) values((select auth.uid()),'paiement_rejete',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre,'raison',motif));
  return 'rejete';
 end if;
 if p.offre='Appels' and exists(select 1 from public.statuts s where s.user_id=p.user_id and s.premium_until>now()) then raise exception 'appels_deja_inclus_dans_premium';end if;
 insert into public.statuts(user_id) values(p.user_id) on conflict do nothing;
 if p.offre='Premium' then
  update public.statuts set premium_until=greatest(coalesce(premium_until,now()),now())+interval '30 days' where user_id=p.user_id;
  select premium_until into ends_at from public.statuts where user_id=p.user_id;
 elsif p.offre='Boost' then
  update public.statuts set boost_until=greatest(coalesce(boost_until,now()),now())+interval '1 day' where user_id=p.user_id;
  select boost_until into ends_at from public.statuts where user_id=p.user_id;
 elsif p.offre='Badge Vérifié' then
  update public.statuts set verified_until=greatest(coalesce(verified_until,now()),now())+interval '14 days' where user_id=p.user_id;
  select verified_until into ends_at from public.statuts where user_id=p.user_id;
 elsif p.offre='Contact' then
  insert into public.deblocages(user_id,cible) values(p.user_id,p.cible) on conflict do nothing;
 elsif p.offre='Appels' then
  select greatest(coalesce(max(entitlement_expires_at),now()),now())+interval '7 days' into ends_at
  from public.paiements where user_id=p.user_id and offre='Appels' and statut='valide' and entitlement_expires_at>now();
 end if;
 update public.paiements set statut='valide',admin_reason=null,reviewed_at=now(),entitlement_starts_at=starts_at,entitlement_expires_at=ends_at where id=pid;
 insert into public.admin_actions(admin_id,action,cible,details) values((select auth.uid()),'paiement_valide',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre,'expire_le',ends_at));
 return 'ok';
end $function$;
create or replace function private.traiter_paiement(pid bigint,accepter boolean)
returns text language sql security definer set search_path='' as $function$ select private.traiter_paiement(pid,accepter,null) $function$;
create or replace function public.traiter_paiement(pid bigint,accepter boolean,raison text)
returns text language sql set search_path='' as $function$ select private.traiter_paiement(pid,accepter,raison) $function$;
create or replace function public.traiter_paiement(pid bigint,accepter boolean)
returns text language sql set search_path='' as $function$ select private.traiter_paiement(pid,accepter,null) $function$;

drop policy if exists "paid matched members can call" on public.call_sessions;
create policy "paid matched members can call" on public.call_sessions for insert to authenticated
with check((select auth.uid())=caller_id and status='pending' and expires_at>now() and expires_at<=now()+interval '3 minutes'
 and (exists(select 1 from public.statuts s where s.user_id=(select auth.uid()) and s.premium_until>now())
  or exists(select 1 from public.paiements pay where pay.user_id=(select auth.uid()) and pay.offre='Appels' and pay.statut='valide'
   and coalesce(pay.entitlement_expires_at,pay.reviewed_at+interval '7 days',pay.created_at+interval '7 days')>now()))
 and exists(select 1 from public.avis_match a where a.user_id=(select auth.uid()) and a.autre=callee_id and a.ok=true)
 and exists(select 1 from public.avis_match a where a.user_id=callee_id and a.autre=(select auth.uid()) and a.ok=true));

drop policy if exists "declarer un paiement" on public.paiements;
create policy "declarer un paiement" on public.paiements for insert to authenticated
with check(user_id=(select auth.uid()) and statut='attente'
 and offre=any(array['Premium','Boost','Badge Vérifié','Contact','Appels'])
 and char_length(btrim(code)) between 4 and 100
 and ((offre='Contact' and cible is not null and cible<>(select auth.uid()) and exists(select 1 from public.profiles p where p.id=paiements.cible))
  or(offre<>'Contact' and cible is null))
 and not(offre='Appels' and exists(select 1 from public.statuts s where s.user_id=(select auth.uid()) and s.premium_until>now())));

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('malachite-entitlement-expiry-notifications','*/5 * * * *','select private.process_expired_entitlements()');
