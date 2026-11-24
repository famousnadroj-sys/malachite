create schema if not exists auth;
create schema if not exists private;
do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create table public.profiles(id uuid primary key);
create table public.suspensions(user_id uuid primary key);
create table public.blocages(user_id uuid not null,cible uuid not null);
create table public.statuts(user_id uuid,premium_until timestamptz);
create table public.paiements(user_id uuid,offre text,statut text,entitlement_expires_at timestamptz,reviewed_at timestamptz,created_at timestamptz default now());
create table public.avis_match(user_id uuid,autre uuid,ok boolean);
create table public.call_sessions(id uuid primary key,caller_id uuid,callee_id uuid,room text,mode text,status text,created_at timestamptz default now(),expires_at timestamptz,ended_at timestamptz);
create table public.rendez_vous(id bigint generated always as identity primary key,de uuid,a uuid,quand timestamptz,lieu text,message text,lien_carte text,statut text default 'attente',created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function private.is_suspended(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.suspensions where user_id=p_user) $$;
create or replace function private.is_blocked_with(p_other uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.blocages b where (b.user_id=(select auth.uid()) and b.cible=p_other) or (b.user_id=p_other and b.cible=(select auth.uid()))) $$;
alter table public.call_sessions enable row level security;
alter table public.rendez_vous enable row level security;
create policy "call participants can read" on public.call_sessions for select to authenticated using ((auth.uid()=caller_id) or (auth.uid()=callee_id));
create policy "call participants can update" on public.call_sessions for update to authenticated using ((auth.uid()=caller_id) or (auth.uid()=callee_id)) with check ((auth.uid()=caller_id) or (auth.uid()=callee_id));
create policy "paid matched members can call" on public.call_sessions for insert to authenticated with check (caller_id=auth.uid() and status='pending' and expires_at>now() and expires_at<=now()+interval '3 minutes'
 and (exists(select 1 from public.statuts s where s.user_id=auth.uid() and s.premium_until>now()))
 and exists(select 1 from public.avis_match a where a.user_id=auth.uid() and a.autre=callee_id and a.ok=true)
 and exists(select 1 from public.avis_match a where a.user_id=callee_id and a.autre=auth.uid() and a.ok=true)
 and not private.is_blocked_with(callee_id));
create policy "creer un rdv" on public.rendez_vous for insert to authenticated with check (de=auth.uid() and a<>auth.uid() and statut='attente' and not private.is_blocked_with(a) and not private.is_suspended(auth.uid()));
create policy "repondre a un rdv" on public.rendez_vous for update to authenticated using (a=auth.uid()) with check (a=auth.uid() and not private.is_blocked_with(de));
create policy "voir ses rdv" on public.rendez_vous for select to authenticated using (de=auth.uid() or a=auth.uid());
grant usage on schema auth,private,public to authenticated;
grant execute on function auth.uid(),private.is_suspended(uuid),private.is_blocked_with(uuid) to authenticated;
grant select,insert,update on public.call_sessions to authenticated;
grant select,insert on public.rendez_vous to authenticated;
