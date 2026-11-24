create schema if not exists auth;
create schema if not exists private;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table public.profiles(id uuid primary key, prenom text, username text, profile_private boolean default false);
create table public.suspensions(user_id uuid primary key);
create table public.blocages(user_id uuid, cible uuid);
create table public.statuts(user_id uuid, premium_until timestamptz);
create table public.paiements(user_id uuid, offre text, statut text, entitlement_expires_at timestamptz, reviewed_at timestamptz, created_at timestamptz default now());
create table public.avis_match(user_id uuid, autre uuid, ok boolean);
create table public.call_sessions(id uuid primary key, caller_id uuid, callee_id uuid, room text, mode text, status text, expires_at timestamptz);
create or replace function private.is_suspended(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.suspensions where user_id=p_user)
$$;
create or replace function private.is_blocked_with(p_other uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.blocages b where
   (b.user_id=(select auth.uid()) and b.cible=p_other)
   or (b.user_id=p_other and b.cible=(select auth.uid())))
$$;

-- The isolated fixture lets the authenticated test session arrange either side
-- of a block; production policies are not changed by this test-only grant.
grant select, insert, delete on public.blocages to authenticated;
