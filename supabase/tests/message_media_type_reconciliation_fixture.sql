-- Match the Supabase API roles used by migration GRANT/REVOKE statements.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create schema if not exists private;
create or replace function private.is_suspended(p_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select false $$;
create or replace function private.is_blocked_with(p_other_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select false $$;
create or replace function private.est_premium(p_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select true $$;

create table public.messages(
 id bigint generated always as identity primary key,
 de uuid not null,
 a uuid not null,
 texte text,
 media_url text,
 media_type text,
 created_at timestamptz not null default now()
);
create or replace function public.limite_messages()
returns trigger language plpgsql as $stub$ begin return new; end $stub$;

insert into auth.users(id) values
 ('50000000-0000-0000-0000-000000000001'),
 ('60000000-0000-0000-0000-000000000001');

insert into public.messages(de,a,texte,media_url,media_type) values
 ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','legacy existing call link','https://meet.jit.si/Malachite0123456789abcdef0123','call');
