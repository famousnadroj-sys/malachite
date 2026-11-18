-- Malachite: sécurité, signalements et blocage des membres
-- Préparé sur une branche isolée. NE PAS appliquer en production sans tests de non-régression.
begin;

-- A. Historique et traitement des signalements
alter table public.signalements
  add column if not exists statut text not null default 'nouveau',
  add column if not exists traite_par uuid references auth.users(id),
  add column if not exists traite_le timestamptz,
  add column if not exists note_admin text;

alter table public.signalements
  drop constraint if exists signalements_statut_check;
alter table public.signalements
  add constraint signalements_statut_check
  check (statut in ('nouveau','examine','rejete'));

drop policy if exists "signaler" on public.signalements;
create policy "signaler"
on public.signalements for insert to authenticated
with check (
  de = (select auth.uid())
  and profil <> (select auth.uid())
  and motif is not null
  and char_length(btrim(motif)) between 1 and 300
  and exists (select 1 from public.profiles p where p.id = profil)
);

drop policy if exists "admin voit signalements" on public.signalements;
create policy "admin voit signalements"
on public.signalements for select to authenticated
using ((select auth.jwt() ->> 'email') = 'famousnadroj@gmail.com');

drop policy if exists "admin traite signalements" on public.signalements;
create policy "admin traite signalements"
on public.signalements for update to authenticated
using ((select auth.jwt() ->> 'email') = 'famousnadroj@gmail.com')
with check (
  (select auth.jwt() ->> 'email') = 'famousnadroj@gmail.com'
  and statut in ('nouveau','examine','rejete')
);

create index if not exists signalements_statut_created_idx
  on public.signalements (statut, created_at desc);

-- Payment requests may only use known offers and a plausible non-empty code.
drop policy if exists "declarer un paiement" on public.paiements;
create policy "declarer un paiement" on public.paiements
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and statut = 'attente'
  and offre in ('Premium','Boost','Badge Vérifié','Contact')
  and char_length(btrim(code)) between 4 and 100
  and (
    (offre = 'Contact'
      and cible is not null
      and cible <> (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = cible))
    or
    (offre <> 'Contact' and cible is null)
  )
);

-- Current data has no duplicate transaction codes; prevent re-use going forward.
create unique index if not exists paiements_code_unique_idx on public.paiements (code);

-- Keep matching preferences private: profiles is visible to all signed-in members.
alter table public.prives
  add column if not exists prefs jsonb not null default '{}'::jsonb;

-- The frontend's presence heartbeat reads and updates this timestamp.
alter table public.profiles
  add column if not exists derniere_vue timestamptz;

update public.prives pv
set prefs = coalesce(p.prefs, '{}'::jsonb)
from public.profiles p
where p.id = pv.id
  and p.prefs is not null
  and pv.prefs = '{}'::jsonb;

update public.profiles set prefs = null where prefs is not null;
revoke select on table public.profiles from authenticated;
grant select (id, prenom, age, genre, commune, profession, bio, interets, photos, created_at, prompts, derniere_vue)
  on table public.profiles to authenticated;

-- B. Blocage privé entre membres (séparé de deblocages, qui sert aux achats de contacts)
create table if not exists public.blocages (
  user_id uuid not null references auth.users(id) on delete cascade,
  cible uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocages_pk primary key (user_id, cible),
  constraint blocages_no_self check (user_id <> cible)
);
alter table public.blocages enable row level security;
grant select, insert, delete on table public.blocages to authenticated;
revoke update, truncate, references, trigger on table public.blocages from authenticated;

drop policy if exists "voir ses blocages" on public.blocages;
create policy "voir ses blocages" on public.blocages
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "creer ses blocages" on public.blocages;
create policy "creer ses blocages" on public.blocages
for insert to authenticated
with check (user_id = (select auth.uid()) and cible <> (select auth.uid()));

drop policy if exists "supprimer ses blocages" on public.blocages;
create policy "supprimer ses blocages" on public.blocages
for delete to authenticated using (user_id = (select auth.uid()));

create index if not exists blocages_cible_idx on public.blocages(cible);

-- Renvoie uniquement les identifiants des membres que l'utilisateur courant a bloqués.
create or replace function private.blocked_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $
  select b.cible
  from public.blocages b
  where auth.uid() is not null and b.user_id = auth.uid();
$;

create or replace function public.blocked_user_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $
  select * from private.blocked_user_ids();
$;

-- Vérifie un blocage sans exposer la table privée à l'appelant.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocages b
    where (b.user_id = (select auth.uid()) and b.cible = p_other)
       or (b.user_id = p_other and b.cible = (select auth.uid()))
  );
$$;

revoke all on function private.blocked_user_ids() from public, anon;
grant execute on function private.blocked_user_ids() to authenticated;
revoke all on function public.blocked_user_ids() from public, anon;
grant execute on function public.blocked_user_ids() to authenticated;
revoke all on function private.is_blocked_with(uuid) from public, anon;
grant execute on function private.is_blocked_with(uuid) to authenticated;

-- Public RPC wrapper required by the browser client. The implementation stays
-- in the non-exposed private schema; only authenticated users can call it.
create or replace function public.is_blocked_with(p_other uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_blocked_with(p_other);
$function$;
revoke all on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- Keep privileged lookup logic outside the exposed public API schema.
create or replace function private.est_match(p_autre uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
     and p_autre <> auth.uid()
     and exists (
       select 1 from public.avis_match x
       where x.user_id = auth.uid() and x.autre = p_autre and x.ok
     )
     and exists (
       select 1 from public.avis_match y
       where y.user_id = p_autre and y.autre = auth.uid() and y.ok
     );
$function$;

create or replace function private.est_premium(u uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
     and u = auth.uid()
     and coalesce((
       select s.premium_until > now()
       from public.statuts s
       where s.user_id = auth.uid()
     ), false);
$function$;

create or replace function private.contact_de(p_autre uuid)
returns table(nom text, tel text)
language sql
stable
security definer
set search_path = ''
as $function$
  select pr.nom_complet, pr.telephone
  from public.prives pr
  where auth.uid() is not null
    and p_autre <> auth.uid()
    and pr.id = p_autre
    and private.est_match(p_autre)
    and not private.is_blocked_with(p_autre)
    and (
      private.est_premium(auth.uid())
      or exists (
        select 1 from public.deblocages d
        where d.user_id = auth.uid() and d.cible = p_autre
      )
    );
$function$;

revoke all on function private.est_match(uuid) from public, anon;
revoke all on function private.est_premium(uuid) from public, anon;
revoke all on function private.contact_de(uuid) from public, anon;
grant execute on function private.est_match(uuid), private.est_premium(uuid), private.contact_de(uuid) to authenticated;

-- Public RPC names stay compatible with the existing browser client, but wrappers
-- run as invoker and delegate only to the guarded private implementations.
create or replace function public.est_match(p_autre uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.est_match(p_autre);
$function$;

create or replace function public.contact_de(p_autre uuid)
returns table(nom text, tel text)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from private.contact_de(p_autre);
$function$;

revoke all on function public.est_match(uuid), public.contact_de(uuid) from public, anon;
grant execute on function public.est_match(uuid), public.contact_de(uuid) to authenticated;

-- Liste limitée aux membres que l'utilisateur courant a lui-même bloqués,
-- afin de lui permettre de les débloquer sans exposer les blocages des autres.
create or replace function private.my_blocked_profiles()
returns table(id uuid, prenom text, commune text)
language sql
stable
security definer
set search_path = ''
as $
  select p.id, p.prenom, p.commune
  from public.blocages b
  join public.profiles p on p.id = b.cible
  where auth.uid() is not null and b.user_id = auth.uid();
$;

create or replace function public.my_blocked_profiles()
returns table(id uuid, prenom text, commune text)
language sql
stable
security invoker
set search_path = ''
as $
  select * from private.my_blocked_profiles();
$;

revoke all on function private.my_blocked_profiles() from public, anon;
grant execute on function private.my_blocked_profiles() to authenticated;
revoke all on function public.my_blocked_profiles() from public, anon;
grant execute on function public.my_blocked_profiles() to authenticated;

-- C. Appliquer le blocage aux profils, messages, likes et rendez-vous
drop policy if exists "voir profils" on public.profiles;
create policy "voir profils" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or not private.is_blocked_with(id)
);

drop policy if exists "lire ses messages" on public.messages;
create policy "lire ses messages" on public.messages
for select to authenticated
using (
  (de = (select auth.uid()) or a = (select auth.uid()))
  and not private.is_blocked_with(
    case when de = (select auth.uid()) then a else de end
  )
);

drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message" on public.messages
for insert to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and not private.is_blocked_with(a)
  and exists (select 1 from public.profiles p where p.id = a)
);

drop policy if exists "donner un avis" on public.avis_match;
create policy "donner un avis" on public.avis_match
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and autre <> (select auth.uid())
  and not private.is_blocked_with(autre)
);

drop policy if exists "changer son avis" on public.avis_match;
create policy "changer son avis" on public.avis_match
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and autre <> (select auth.uid())
  and not private.is_blocked_with(autre)
);

drop policy if exists "voir ses rdv" on public.rendez_vous;
create policy "voir ses rdv" on public.rendez_vous
for select to authenticated
using (
  (de = (select auth.uid()) or a = (select auth.uid()))
  and not private.is_blocked_with(
    case when de = (select auth.uid()) then a else de end
  )
);

drop policy if exists "creer un rdv" on public.rendez_vous;
create policy "creer un rdv" on public.rendez_vous
for insert to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and statut = 'attente'
  and not private.is_blocked_with(a)
);

drop policy if exists "repondre a un rdv" on public.rendez_vous;
create policy "repondre a un rdv" on public.rendez_vous
for update to authenticated
using (a = (select auth.uid()))
with check (
  a = (select auth.uid())
  and not private.is_blocked_with(de)
);

-- D. Réduire les privilèges inutiles des rôles exposés
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- E. Les fonctions SECURITY DEFINER ne sont pas exposées aux visiteurs anonymes.
revoke execute on function public.contact_de(uuid) from public, anon, authenticated;
revoke execute on function public.est_match(uuid) from public, anon, authenticated;
revoke execute on function public.est_premium(uuid) from public, anon, authenticated;
revoke execute on function public.limite_messages() from public, anon, authenticated;
revoke execute on function public.limite_rdv() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- Align the free-message quota with the 15/day limit shown in the UI.
create or replace function public.limite_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare n int;
begin
  if not private.est_premium(new.de) then
    if new.texte ~* '(\d[\s.\-]*){8,}|whats|watsap|wa\.me|telegram|messenger|facebook|instagram|snap' then
      raise exception 'contact_interdit';
    end if;
    select count(*) into n
    from public.messages
    where de = new.de and created_at >= date_trunc('day', now());
    if n >= 15 then raise exception 'limite_gratuite'; end if;
  end if;
  return new;
end;
$function$;

-- Keep the appointment quota trigger privileged only internally.
create or replace function public.limite_rdv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.est_premium(new.de)
     and exists (
       select 1 from public.rendez_vous r
       where r.de = new.de and r.created_at > now() - interval '7 days'
     ) then
    raise exception 'limite_rdv';
  end if;
  return new;
end;
$function$;

-- Validate the offer and Contact target before granting any benefit.
create or replace function private.traiter_paiement(pid bigint, accepter boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare p public.paiements%rowtype;
begin
  if (auth.jwt() ->> 'email') is distinct from 'famousnadroj@gmail.com' then
    raise exception 'interdit';
  end if;

  select * into p
  from public.paiements
  where id = pid and statut = 'attente'
  for update;

  if not found then return 'introuvable'; end if;

  if p.offre not in ('Premium', 'Boost', 'Badge Vérifié', 'Contact') then
    raise exception 'offre_invalide';
  end if;
  if p.offre = 'Contact' and (
    p.cible is null
    or p.cible = p.user_id
    or not exists (select 1 from public.profiles where id = p.cible)
  ) then
    raise exception 'cible_invalide';
  end if;

  if not accepter then
    update public.paiements set statut = 'rejete' where id = pid;
    return 'rejete';
  end if;

  insert into public.statuts (user_id)
  values (p.user_id)
  on conflict do nothing;

  if p.offre = 'Premium' then
    update public.statuts
    set premium_until = greatest(coalesce(premium_until, now()), now()) + interval '30 days'
    where user_id = p.user_id;
  elsif p.offre = 'Boost' then
    update public.statuts
    set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '1 day'
    where user_id = p.user_id;
  elsif p.offre = 'Badge Vérifié' then
    update public.statuts
    set verified_until = greatest(coalesce(verified_until, now()), now()) + interval '14 days'
    where user_id = p.user_id;
  elsif p.offre = 'Contact' then
    insert into public.deblocages (user_id, cible)
    values (p.user_id, p.cible)
    on conflict do nothing;
  end if;

  update public.paiements set statut = 'valide' where id = pid;
  return 'ok';
end;
$function$;

revoke all on function private.traiter_paiement(bigint, boolean) from public, anon;
grant execute on function private.traiter_paiement(bigint, boolean) to authenticated;

create or replace function public.traiter_paiement(pid bigint, accepter boolean)
returns text
language sql
security invoker
set search_path = ''
as $function$
  select private.traiter_paiement(pid, accepter);
$function$;

revoke all on function public.traiter_paiement(bigint, boolean) from public, anon;
grant execute on function public.traiter_paiement(bigint, boolean) to authenticated;

commit;
