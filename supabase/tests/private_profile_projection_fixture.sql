do $$
begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then
  create role authenticated nologin;
 end if;
end
$$;

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

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create or replace function private.is_blocked_with(target uuid)
returns boolean language sql stable
as $$ select false $$;

create or replace function private.is_suspended(target uuid)
returns boolean language sql stable
as $$ select false $$;

