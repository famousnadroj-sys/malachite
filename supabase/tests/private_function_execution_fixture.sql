-- Minimal isolated schema for private-function EXECUTE ACL regression tests.
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end
$roles$;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid language sql stable
as $uid$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $uid$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path=''
as $fn$ select false $fn$;
create or replace function private.is_blocked_with(uuid) returns boolean
language sql stable security definer set search_path=''
as $fn$ select false $fn$;
create or replace function private.is_suspended(uuid) returns boolean
language sql stable security definer set search_path=''
as $fn$ select false $fn$;
create or replace function private.account_exists(uuid) returns boolean
language sql stable security definer set search_path=''
as $fn$ select false $fn$;
create or replace function private.blocked_text(text) returns boolean
language sql stable security definer set search_path=''
as $fn$ select false $fn$;

create or replace function private.admin_moderate_user(uuid,text,text) returns jsonb
language sql security definer set search_path=''
as $fn$ select '{}'::jsonb $fn$;
create or replace function private.contact_de(uuid) returns table(nom text,tel text)
language sql security definer set search_path=''
as $fn$ select null::text,null::text where false $fn$;
create or replace function private.traiter_paiement(bigint,boolean,text) returns text
language sql security definer set search_path=''
as $fn$ select 'ok'::text $fn$;
create or replace function private.create_my_notification(text,text,text,text) returns bigint
language sql security definer set search_path=''
as $fn$ select 1::bigint $fn$;

create or replace function public.get_malachite_referrer_preview(uuid)
returns table(prenom text,username text)
language sql security definer set search_path=''
as $fn$ select null::text,null::text where false $fn$;
create or replace function public.contact_de(uuid) returns table(nom text,tel text)
language sql security definer set search_path=''
as $fn$ select null::text,null::text where false $fn$;
create or replace function public.moderate_user(uuid,text,text) returns jsonb
language sql security definer set search_path=''
as $fn$ select '{}'::jsonb $fn$;
create or replace function public.traiter_paiement(bigint,boolean,text) returns text
language sql security definer set search_path=''
as $fn$ select 'ok'::text $fn$;
create or replace function public.match_like_quota() returns jsonb
language sql security definer set search_path=''
as $fn$ select '{}'::jsonb $fn$;

grant execute on function public.get_malachite_referrer_preview(uuid) to anon, authenticated;
grant execute on function public.contact_de(uuid) to authenticated;
grant execute on function public.moderate_user(uuid,text,text) to authenticated;
grant execute on function public.traiter_paiement(bigint,boolean,text) to authenticated;
grant execute on function public.match_like_quota() to authenticated;

create table public.profiles(id uuid primary key);
create table public.messages(id bigint generated always as identity primary key);
create table public.avis_match(id bigint generated always as identity primary key);
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.avis_match enable row level security;

create policy acl_profiles_read on public.profiles
  for select to authenticated using (not private.is_suspended(id));
create policy acl_messages_read on public.messages
  for select to authenticated using (not private.is_blocked_with('00000000-0000-0000-0000-000000000001'));
create policy acl_messages_insert on public.messages
  for insert to authenticated with check (private.account_exists('00000000-0000-0000-0000-000000000001'));
create policy acl_match_read on public.avis_match
  for select to authenticated using (not private.is_suspended('00000000-0000-0000-0000-000000000001'));

create schema if not exists storage;
create table storage.objects(name text primary key);
alter table storage.objects enable row level security;
create policy acl_storage_read on storage.objects
  for select to authenticated using (not private.blocked_text(name));
grant usage on schema storage to authenticated;
grant select on public.profiles, public.messages, public.avis_match, storage.objects to authenticated;
