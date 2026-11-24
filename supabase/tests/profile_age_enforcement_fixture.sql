do $$
begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.profiles(
 id uuid primary key references auth.users(id),
 username text,
 prenom text not null,
 age integer check(age >= 18),
 genre text, commune text, quartier text, profession text, bio text,
 interets text[] not null default '{}'::text[],
 photos text[] not null default '{}'::text[],
 prompts jsonb not null default '[]'::jsonb,
 profile_private boolean not null default false,
 avatar jsonb not null default '{}'::jsonb
);
create table public.prives(
 id uuid primary key references auth.users(id),
 nom_complet text, adresse text, telephone text, prefs jsonb not null default '{}'::jsonb
);
create table public.login_names(
 user_id uuid primary key references auth.users(id),
 username text unique not null
);
grant usage on schema public,auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant select,insert,update on public.profiles,public.prives,public.login_names to authenticated;
