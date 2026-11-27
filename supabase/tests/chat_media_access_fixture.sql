create schema if not exists auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create schema if not exists storage;
create or replace function storage.foldername(p_name text)
returns text[] language sql immutable
as $$ select (string_to_array(p_name,'/'))[1:array_length(string_to_array(p_name,'/'),1)-1] $$;

create schema if not exists private;
create table public.blocages(user_id uuid not null,cible uuid not null,primary key(user_id,cible));
create table public.suspensions(user_id uuid primary key);
create table public.profiles(id uuid primary key);
alter table public.profiles enable row level security;
create table public.messages(id bigint primary key,de uuid not null,a uuid not null,media_url text);
create table storage.objects(bucket_id text not null,name text not null,primary key(bucket_id,name));

create or replace function private.is_blocked_with(p_other_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.blocages where (user_id=auth.uid() and cible=p_other_user_id) or (user_id=p_other_user_id and cible=auth.uid())) $$;
create or replace function private.is_suspended(p_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.suspensions where user_id=p_user_id) $$;

do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $roles$;

grant usage on schema public,private,storage,auth to authenticated;
grant select,insert,update,delete on public.messages to authenticated; -- simulate legacy broad grants
grant select on public.profiles,storage.objects to authenticated;
grant select on public.blocages,public.suspensions to authenticated;
alter table public.messages enable row level security;
alter table storage.objects enable row level security;
create policy "lire ses messages" on public.messages for select to authenticated
using ((de=auth.uid() or a=auth.uid()) and not private.is_blocked_with(case when de=auth.uid() then a else de end));
create policy "envoyer un message" on public.messages for insert to authenticated
with check (de=auth.uid() and a<>auth.uid() and not private.is_blocked_with(a)
  and not private.is_suspended(auth.uid()) and exists(select 1 from public.profiles p where p.id=messages.a));
create policy "legacy chat media read participants" on storage.objects for select to authenticated
using (bucket_id='photos' and exists (
 select 1 from public.messages m
 where split_part(m.media_url,'/storage/v1/object/public/photos/',2)=objects.name
 and (m.de=auth.uid() or m.a=auth.uid())
 and not private.is_blocked_with(case when m.de=auth.uid() then m.a else m.de end)
));

insert into auth.users(id) values ('50000000-0000-0000-0000-000000000001'),('60000000-0000-0000-0000-000000000001');
insert into public.profiles(id) values ('50000000-0000-0000-0000-000000000001'),('60000000-0000-0000-0000-000000000001');

insert into public.messages(id,de,a,media_url) values
 (1,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/photo-1.jpg'),
 (2,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/forged-path.jpg'),
 (3,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','https://example.supabase.co/storage/v1/object/public/photos/50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/legacy-chat.jpg');
insert into storage.objects(bucket_id,name) values
 ('chat-media','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/photo-1.jpg'),
 ('chat-media','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/orphan.jpg'),
 ('chat-media','70000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/other-chat.jpg'),
 ('chat-media','70000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/forged-path.jpg'),
 ('photos','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/legacy-chat.jpg'),
 ('photos','70000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/forged-legacy.jpg');
