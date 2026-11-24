-- Minimal disposable schema for required adult-age database checks.
create schema auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.prives(
 id uuid primary key references auth.users(id),
 nom_complet text,
 adresse text,
 telephone text,
 prefs jsonb not null default '{}'::jsonb
);
create table public.login_names(
 user_id uuid primary key references auth.users(id),
 username text unique not null
);
create table public.profiles(
 id uuid primary key references auth.users(id),
 username text,
 prenom text not null,
 age integer,
 genre text,
 commune text,
 quartier text,
 profession text,
 bio text,
 interets text[] not null default '{}'::text[],
 photos text[] not null default '{}'::text[],
 prompts jsonb not null default '[]'::jsonb,
 profile_private boolean not null default false,
 avatar jsonb not null default '{}'::jsonb,
 constraint profiles_age_check check (age >= 18)
);
