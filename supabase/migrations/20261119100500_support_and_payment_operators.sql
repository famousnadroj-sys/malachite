alter table public.paiements add column if not exists operateur text;
alter table public.paiements drop constraint if exists paiements_operateur_check;
alter table public.paiements add constraint paiements_operateur_check check (operateur is null or operateur in ('airtel','orange'));
create table if not exists public.demandes_support (
 id bigint generated always as identity primary key,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 categorie text not null check (categorie in ('compte','paiement','securite','bug','autre')),
 sujet text not null check (char_length(sujet) between 3 and 120),
 message text not null check (char_length(message) between 10 and 2000),
 statut text not null default 'nouveau' check (statut in ('nouveau','en_cours','resolu','rejete')),
 reponse_admin text,
 traite_par uuid references auth.users(id),
 created_at timestamptz not null default now(),
 traite_le timestamptz
);
alter table public.demandes_support enable row level security;
drop policy if exists support_insert_own on public.demandes_support;
create policy support_insert_own on public.demandes_support for insert to authenticated with check (user_id=auth.uid());
drop policy if exists support_read_own_or_admin on public.demandes_support;
create policy support_read_own_or_admin on public.demandes_support for select to authenticated using (user_id=auth.uid() or private.is_admin());
drop policy if exists support_admin_update on public.demandes_support;
create policy support_admin_update on public.demandes_support for update to authenticated using (private.is_admin()) with check (private.is_admin());
grant select,insert,update on public.demandes_support to authenticated;
grant usage,select on sequence public.demandes_support_id_seq to authenticated;