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

-- Ne révèle pas la liste des bloqueurs : renvoie uniquement les identifiants
-- que l'utilisateur courant doit masquer (blocage dans un sens ou l'autre).
create or replace function public.blocked_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.cible from public.blocages b where b.user_id = (select auth.uid());
$$;

-- Vérifie un blocage sans exposer la table privée à l'appelant.
create or replace function public.is_blocked_with(p_other uuid)
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

revoke all on function public.blocked_user_ids() from public, anon;
grant execute on function public.blocked_user_ids() to authenticated;
revoke all on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- Liste limitée aux membres que l'utilisateur courant a lui-même bloqués,
-- afin de lui permettre de les débloquer sans exposer les blocages des autres.
create or replace function public.my_blocked_profiles()
returns table(id uuid, prenom text, commune text)
language sql
stable
security definer
set search_path = ''
as $
  select p.id, p.prenom, p.commune
  from public.blocages b
  join public.profiles p on p.id = b.cible
  where b.user_id = (select auth.uid());
$;
revoke all on function public.my_blocked_profiles() from public, anon;
grant execute on function public.my_blocked_profiles() to authenticated;

-- C. Appliquer le blocage aux profils, messages, likes et rendez-vous
drop policy if exists "voir profils" on public.profiles;
create policy "voir profils" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or not public.is_blocked_with(id)
);

drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message" on public.messages
for insert to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and not public.is_blocked_with(a)
  and exists (select 1 from public.profiles p where p.id = a)
);

drop policy if exists "donner un avis" on public.avis_match;
create policy "donner un avis" on public.avis_match
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and autre <> (select auth.uid())
  and not public.is_blocked_with(autre)
);

drop policy if exists "changer son avis" on public.avis_match;
create policy "changer son avis" on public.avis_match
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and autre <> (select auth.uid())
  and not public.is_blocked_with(autre)
);

drop policy if exists "creer un rdv" on public.rendez_vous;
create policy "creer un rdv" on public.rendez_vous
for insert to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and statut = 'attente'
  and not public.is_blocked_with(a)
);

drop policy if exists "repondre a un rdv" on public.rendez_vous;
create policy "repondre a un rdv" on public.rendez_vous
for update to authenticated
using (a = (select auth.uid()))
with check (
  a = (select auth.uid())
  and not public.is_blocked_with(de)
);

-- D. Réduire les privilèges inutiles des rôles exposés
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- E. Les fonctions SECURITY DEFINER ne sont pas exposées aux visiteurs anonymes.
revoke execute on function public.contact_de(uuid) from public, anon;
grant execute on function public.contact_de(uuid) to authenticated;
revoke execute on function public.est_match(uuid) from public, anon;
grant execute on function public.est_match(uuid) to authenticated;
revoke execute on function public.est_premium(uuid) from public, anon;
grant execute on function public.est_premium(uuid) to authenticated;
revoke execute on function public.limite_messages() from public, anon, authenticated;
revoke execute on function public.limite_rdv() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.traiter_paiement(bigint, boolean) from public, anon;
grant execute on function public.traiter_paiement(bigint, boolean) to authenticated;

commit;
