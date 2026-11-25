create schema if not exists auth;
create schema if not exists private;
create schema if not exists storage;
create table auth.users(id uuid primary key);
do $$ begin
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create table public.profiles(id uuid primary key references auth.users(id), prenom text not null);
create table public.suspensions(user_id uuid primary key);
create table public.blocages(user_id uuid not null,cible uuid not null);
create table public.messages(id bigint generated always as identity primary key,de uuid not null,a uuid not null,texte text not null default '',created_at timestamptz default now(),media_url text,media_type text);
create table storage.objects(bucket_id text not null,name text not null);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function storage.foldername(value text) returns text[] language sql immutable as $$ select (string_to_array(value,'/'))[1:greatest(array_length(string_to_array(value,'/'),1)-1,0)] $$;
create or replace function private.is_suspended(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.suspensions where user_id=p_user) $$;
create or replace function private.is_blocked_with(p_other uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.blocages b where (b.user_id=(select auth.uid()) and b.cible=p_other) or (b.user_id=p_other and b.cible=(select auth.uid()))) $$;
create or replace function private.blocked_text(p_other text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.blocages b where (b.user_id=(select auth.uid()) and b.cible::text=p_other) or (b.user_id::text=p_other and b.cible=(select auth.uid()))) $$;
create or replace function private.est_premium(p_user uuid) returns boolean language sql stable as $$ select false $$;
alter table public.messages enable row level security;
alter table storage.objects enable row level security;
create policy "envoyer un message" on public.messages for insert to authenticated with check (de=(select auth.uid()) and a<>(select auth.uid()) and not private.is_blocked_with(a) and not private.is_suspended((select auth.uid())) and exists(select 1 from public.profiles p where p.id=messages.a));
create policy "lire ses messages" on public.messages for select to authenticated using ((de=(select auth.uid()) or a=(select auth.uid())) and not private.is_blocked_with(case when de=(select auth.uid()) then a else de end));
create policy "chat-media envoyer" on storage.objects for insert to authenticated with check (bucket_id='chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2] is not null and not private.blocked_text((storage.foldername(name))[2]) and not private.is_suspended((select auth.uid())));
create policy "chat-media lire" on storage.objects for select to authenticated using (bucket_id='chat-media' and (((storage.foldername(name))[1]=(select auth.uid())::text) or ((storage.foldername(name))[2]=(select auth.uid())::text)));

create policy "legacy chat media read participants" on storage.objects for select to authenticated
using (bucket_id='photos' and exists(select 1 from public.messages m
 where split_part(m.media_url,'/storage/v1/object/public/photos/',2)=objects.name
 and (m.de=(select auth.uid()) or m.a=(select auth.uid()))
 and not private.is_blocked_with(case when m.de=(select auth.uid()) then m.a else m.de end)));

create or replace function public.limite_messages() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if new.de is distinct from (select auth.uid()) then raise exception 'sender_invalide'; end if;
 if private.is_suspended(new.de) then raise exception 'compte_suspendu'; end if;
 if private.is_blocked_with(new.a) then raise exception 'conversation_bloquee'; end if;
 if new.media_url is not null or new.media_type is not null then
  if new.media_type in ('image','audio','video','document') then
   if new.media_url is null or new.media_url !~ ('^'||new.de::text||'/'||new.a::text||'/[A-Za-z0-9._-]{1,120}$') then raise exception 'media_invalide'; end if;
  elsif new.media_type='call' then
   if new.media_url is null or new.media_url !~ '^https://meet[.]jit[.]si/Malachite[0-9a-f]{20,40}$' then raise exception 'media_invalide'; end if;
  else raise exception 'media_invalide'; end if;
 end if;
 if not private.est_premium(new.de) and not exists(select 1 from public.messages m where (m.de=new.de and m.a=new.a) or (m.de=new.a and m.a=new.de)) then
  select count(distinct m.a) into n from public.messages m where m.de=new.de and m.created_at>=date_trunc('day',now()) and not exists(select 1 from public.messages prior where prior.de=m.a and prior.a=m.de and prior.created_at<m.created_at);
  if n>=15 then raise exception 'limite_gratuite'; end if;
 end if;
 return new;
end $$;
create trigger trg_limite before insert on public.messages for each row execute function public.limite_messages();
grant usage on schema auth,private,storage,public to authenticated;
grant execute on function auth.uid(),storage.foldername(text),private.is_suspended(uuid),private.is_blocked_with(uuid),private.blocked_text(text),private.est_premium(uuid) to authenticated;
grant select,insert,delete on public.profiles,public.suspensions,public.blocages,public.messages,storage.objects to authenticated;
