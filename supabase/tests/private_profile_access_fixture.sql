do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end
$roles$;

create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;

create table auth.users (id uuid primary key);
create table public.blocages (
  user_id uuid not null,
  cible uuid not null,
  created_at timestamptz not null default now()
);
create table public.suspensions (
  user_id uuid primary key,
  depuis timestamptz not null default now(),
  motif text,
  par uuid
);
create table public.profiles (
  id uuid primary key references auth.users(id),
  prenom text not null,
  username text,
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
  profile_private boolean not null default false,
  avatar jsonb not null default '{}'::jsonb
);
create table storage.objects (
  bucket_id text not null,
  name text not null
);

create or replace function auth.uid()
returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function private.is_blocked_with(p_other uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocages b
    where (b.user_id = (select auth.uid()) and b.cible = p_other)
       or (b.user_id = p_other and b.cible = (select auth.uid()))
  );
$$;

create or replace function private.is_suspended(p_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.suspensions s where s.user_id = p_user);
$$;

create or replace function storage.foldername(value text)
returns text[]
language sql immutable
as $$
  select (string_to_array(value, '/'))[1:greatest(array_length(string_to_array(value, '/'), 1) - 1, 0)];
$$;

-- Simulate the old permissive rules so the migration must replace them.
alter table public.profiles enable row level security;
create policy "voir profils" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (not private.is_blocked_with(id) and not private.is_suspended(id)));

alter table storage.objects enable row level security;
create policy "profile photos read" on storage.objects for select to authenticated
using (bucket_id = 'profile-photos' and not private.is_blocked_with(((storage.foldername(name))[1])::uuid));
create policy "profile photos read published paths" on storage.objects for select to authenticated
using (bucket_id = 'profile-photos');

grant usage on schema public, auth, private, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.is_suspended(uuid) to authenticated;
grant execute on function storage.foldername(text) to authenticated;
grant select on public.profiles, storage.objects to authenticated;

-- Simulate the legacy destructive trigger. The migration must remove it before
-- any member data is written under the corrected rules.
create or replace function private.enforce_private_profile_public_projection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_private then
    new.age := null;
    new.bio := null;
    new.photos := new.photos[1:1];
  end if;
  return new;
end
$$;
create trigger enforce_private_profile_public_projection
before insert or update on public.profiles
for each row execute function private.enforce_private_profile_public_projection();

-- Ensure the corrective grant is exercised by the migration, not preloaded by the fixture.
revoke select on public.profiles from authenticated;
