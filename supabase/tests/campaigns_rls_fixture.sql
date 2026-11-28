create schema if not exists auth;
create schema if not exists private;
create or replace function auth.uid() returns uuid language sql stable
as $fn$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $fn$;
create or replace function private.is_admin() returns boolean language sql stable
as $fn$ select coalesce(current_setting('test.is_admin',true),'false')='true' $fn$;

do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $roles$;

create table public.campagnes(
 id uuid primary key,
 titre text not null,
 description text not null,
 image_path text not null,
 lien text,
 statut text not null,
 debut timestamptz not null,
 fin timestamptz,
 cree_par uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 media_type text not null,
 duration_seconds smallint,
 video_path text,
 placement text not null,
 audio_enabled boolean not null default false
);
alter table public.campagnes enable row level security;
grant usage on schema public,private,auth to authenticated,anon;
grant select,insert,update,delete on public.campagnes to authenticated;
grant execute on function private.is_admin() to authenticated;
insert into public.campagnes(id,titre,description,image_path,statut,debut,fin,cree_par,media_type,placement)
values
 ('80000000-0000-0000-0000-000000000001','active','active','active.png','active',now()-interval '1 hour',null,null,'image','discover'),
 ('80000000-0000-0000-0000-000000000002','future','future','future.png','active',now()+interval '1 day',null,null,'image','discover'),
 ('80000000-0000-0000-0000-000000000003','inactive','inactive','inactive.png','paused',now()-interval '1 day',null,null,'image','discover');
