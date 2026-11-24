create schema if not exists auth;
create schema if not exists private;

create table auth.users (
 id uuid primary key
);

create table public.profiles (
 id uuid primary key references auth.users(id),
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
 derniere_vue timestamptz,
 profile_private boolean not null default false
);
