-- Minimal disposable schema for account-deletion FK migration tests.
-- This is not a production schema and contains no real user data.
create schema if not exists auth;
create table auth.users (
  id uuid primary key
);

create table public.campagnes (
  id bigint generated always as identity primary key,
  cree_par uuid not null references auth.users(id)
);

create table public.demandes_support (
  id bigint generated always as identity primary key,
  traite_par uuid references auth.users(id),
  user_id uuid references auth.users(id) on delete cascade
);

create table public.signalements (
  id bigint generated always as identity primary key,
  traite_par uuid references auth.users(id)
);
