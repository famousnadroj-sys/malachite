-- Prepare nullable audit references for future self-service account deletion.
-- Preserve support tickets, reports and campaign records while removing the
-- deleted account's identity from the actor/creator reference.
-- This migration does not delete users, profiles, messages, payments or files.

begin;

alter table public.campagnes
  alter column cree_par drop not null;

alter table public.campagnes
  drop constraint if exists campagnes_cree_par_fkey;
alter table public.campagnes
  add constraint campagnes_cree_par_fkey
  foreign key (cree_par) references auth.users(id) on delete set null;

alter table public.demandes_support
  drop constraint if exists demandes_support_traite_par_fkey;
alter table public.demandes_support
  add constraint demandes_support_traite_par_fkey
  foreign key (traite_par) references auth.users(id) on delete set null;

alter table public.signalements
  drop constraint if exists signalements_traite_par_fkey;
alter table public.signalements
  add constraint signalements_traite_par_fkey
  foreign key (traite_par) references auth.users(id) on delete set null;

commit;
