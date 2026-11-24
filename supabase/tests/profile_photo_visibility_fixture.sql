do $$
begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end
$$;
create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;
create table auth.users(id uuid primary key);
create table public.profiles(
 id uuid primary key references auth.users(id),
 prenom text not null,
 profile_private boolean not null default false,
 photos text[] not null default '{}'::text[]
);
create table storage.objects(bucket_id text not null,name text not null);
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function private.is_blocked_with(target uuid) returns boolean language sql stable
as $$ select false $$;
create or replace function storage.foldername(value text) returns text[] language sql immutable
as $$ select (string_to_array(value,'/'))[1:greatest(array_length(string_to_array(value,'/'),1)-1,0)] $$;
alter table public.profiles enable row level security;
alter table storage.objects enable row level security;
create policy "fixture profiles read" on public.profiles for select to authenticated using (true);
grant usage on schema public,auth,private,storage to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function storage.foldername(text) to authenticated;
grant select on public.profiles,storage.objects to authenticated;
