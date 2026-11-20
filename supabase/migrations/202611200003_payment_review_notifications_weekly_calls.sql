-- Payment workflow: durable submissions, admin review reason, payer status and weekly call pass.
alter table public.paiements
  add column if not exists admin_reason text,
  add column if not exists reviewed_at timestamptz;

drop policy if exists "voir paiements" on public.paiements;
create policy "voir paiements" on public.paiements
for select to authenticated
using (user_id=(select auth.uid()) or (select private.is_admin()));

do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='paiements') then
  alter publication supabase_realtime add table public.paiements;
 end if;
end $$;

create or replace function private.traiter_paiement(pid bigint, accepter boolean, raison text)
returns text language plpgsql security definer set search_path=''
as $function$
declare p public.paiements%rowtype; motif text;
begin
 if not private.is_admin() then raise exception 'interdit'; end if;
 select * into p from public.paiements where id=pid and statut='attente' for update;
 if not found then return 'introuvable'; end if;
 if p.offre not in ('Premium','Boost','Badge Vérifié','Contact','Appels') then raise exception 'offre_invalide'; end if;
 if p.offre='Contact' and (p.cible is null or p.cible=p.user_id or not exists(select 1 from public.profiles where id=p.cible)) then
  raise exception 'cible_invalide';
 end if;
 if not accepter then
  motif:=nullif(left(btrim(coalesce(raison,'')),500),'');
  if motif is null then raise exception 'motif_refus_obligatoire'; end if;
  update public.paiements set statut='rejete',admin_reason=motif,reviewed_at=now() where id=pid;
  insert into public.admin_actions(admin_id,action,cible,details)
  values ((select auth.uid()),'paiement_rejete',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre,'raison',motif));
  return 'rejete';
 end if;
 insert into public.statuts(user_id) values(p.user_id) on conflict do nothing;
 if p.offre='Premium' then
  update public.statuts set premium_until=greatest(coalesce(premium_until,now()),now())+interval '30 days' where user_id=p.user_id;
 elsif p.offre='Boost' then
  update public.statuts set boost_until=greatest(coalesce(boost_until,now()),now())+interval '1 day' where user_id=p.user_id;
 elsif p.offre='Badge Vérifié' then
  update public.statuts set verified_until=greatest(coalesce(verified_until,now()),now())+interval '14 days' where user_id=p.user_id;
 elsif p.offre='Contact' then
  insert into public.deblocages(user_id,cible) values(p.user_id,p.cible) on conflict do nothing;
 elsif p.offre='Appels' then
  null;
 end if;
 update public.paiements set statut='valide',admin_reason=null,reviewed_at=now() where id=pid;
 insert into public.admin_actions(admin_id,action,cible,details)
 values ((select auth.uid()),'paiement_valide',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre));
 return 'ok';
end
$function$;

create or replace function private.traiter_paiement(pid bigint, accepter boolean)
returns text language sql security definer set search_path=''
as $function$ select private.traiter_paiement(pid,accepter,null) $function$;

create or replace function public.traiter_paiement(pid bigint, accepter boolean, raison text)
returns text language sql set search_path=''
as $function$ select private.traiter_paiement(pid,accepter,raison) $function$;

create or replace function public.traiter_paiement(pid bigint, accepter boolean)
returns text language sql set search_path=''
as $function$ select private.traiter_paiement(pid,accepter,null) $function$;

drop policy if exists "paid matched members can call" on public.call_sessions;
create policy "paid matched members can call" on public.call_sessions
for insert to authenticated
with check(
 auth.uid()=caller_id and status='pending' and expires_at>now() and expires_at<=now()+interval '3 minutes'
 and exists(select 1 from public.paiements pay where pay.user_id=auth.uid() and pay.offre='Appels' and pay.statut='valide' and pay.created_at>=now()-interval '7 days')
 and exists(select 1 from public.avis_match a where a.user_id=auth.uid() and a.autre=callee_id and a.ok=true)
 and exists(select 1 from public.avis_match a where a.user_id=callee_id and a.autre=auth.uid() and a.ok=true)
);
