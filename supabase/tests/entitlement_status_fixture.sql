create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
grant usage on schema auth to authenticated;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 profile_private boolean not null default false
);
create table public.statuts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 premium_until timestamptz,
 verified_until timestamptz,
 boost_until timestamptz
);
create table public.suspensions(user_id uuid primary key);
create table public.blocages(user_id uuid not null,cible uuid not null);
create table public.deblocages(user_id uuid not null,cible uuid not null);
alter table public.statuts enable row level security;
grant select on public.statuts to authenticated;
create policy "voir les statuts" on public.statuts for select to authenticated using (true);

create or replace function private.is_suspended(p_user uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.suspensions where user_id=p_user) $$;
create or replace function private.is_blocked_with(p_other uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(
 select 1 from public.blocages b
 where (b.user_id=auth.uid() and b.cible=p_other)
    or (b.user_id=p_other and b.cible=auth.uid())
) $$;
create or replace function private.contact_de(p_autre uuid)
returns table(nom text,tel text)
language sql stable security definer set search_path=''
as $$ select null::text,null::text where exists(
 select 1 from public.deblocages d where d.user_id=auth.uid() and d.cible=p_autre
) $$;

insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004');
insert into public.profiles(id,profile_private) values
 ('00000000-0000-0000-0000-000000000001',false),
 ('00000000-0000-0000-0000-000000000002',false),
 ('00000000-0000-0000-0000-000000000003',false),
 ('00000000-0000-0000-0000-000000000004',true);
insert into public.statuts(user_id,premium_until,verified_until,boost_until) values
 ('00000000-0000-0000-0000-000000000001',now()+interval '2 days',now()+interval '3 days',now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000000002',now()+interval '2 days',null,now()+interval '1 day'),
 ('00000000-0000-0000-0000-000000000003',now()+interval '2 days',null,null),
 ('00000000-0000-0000-0000-000000000004',now()+interval '2 days',null,null);
insert into public.suspensions(user_id) values ('00000000-0000-0000-0000-000000000003');
insert into public.blocages(user_id,cible) values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
