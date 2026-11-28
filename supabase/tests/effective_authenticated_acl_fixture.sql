do $$
begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create schema private;
create or replace function private.is_admin()
returns boolean language sql stable
as $function$ select coalesce(current_setting('request.jwt.claim.role',true) = 'service_role', false) $function$;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table public.call_sessions(
  id uuid primary key, caller_id uuid, callee_id uuid, room text, mode text,
  status text, expires_at timestamptz
);
create table public.config(cle text, valeur text);
create table public.login_names(user_id uuid, username text);
create table public.paiements(id bigint, user_id uuid, status text, receipt_path text);
create table public.statuts(user_id uuid, status text, expires_at timestamptz);
create table public.profiles(id uuid primary key,derniere_vue timestamptz,bio text);
alter table public.profiles enable row level security;
create policy "profile_read_own" on public.profiles for select
  using (id = (select auth.uid()));
create policy "modifier son profil" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create table public.prives(id uuid, prefs jsonb);
create table public.avis_match(user_id uuid,autre uuid,ok boolean);
create table public.avis_site(id bigint);
create table public.rendez_vous(id bigint,statut text);
create table public.signalements(id bigint,statut text,traite_par uuid,traite_le timestamptz);
create table public.user_notifications(id bigint,read_at timestamptz);
create table public.message_receipts(id bigint,read_at timestamptz);
create table public.messages(id bigint,de uuid,a uuid,texte text,media_type text,media_url text);
create table public.conversation_members(id bigint);
create table public.conversation_pair_index(id bigint);
create table public.conversation_threads(id bigint);
create table public.demandes_support(id bigint,user_id uuid,message text,statut text,reponse_admin text,traite_par uuid,traite_le timestamptz);
alter table public.demandes_support enable row level security;
create policy "support_member_select" on public.demandes_support for select
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "support_member_insert" on public.demandes_support for insert
  with check (user_id = (select auth.uid()));
create policy "support_admin_update" on public.demandes_support for update
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Simulate the previous broad grants on app-facing tables.
grant all on public.profiles,public.avis_match,public.avis_site,public.rendez_vous,
  public.signalements,public.user_notifications,public.message_receipts,public.messages,
  public.conversation_members,public.conversation_pair_index,public.conversation_threads,public.demandes_support to authenticated;

-- Simulate the legacy SECURITY DEFINER call-creation RPC and its client grant.
create or replace function public.start_call_session(
  p_id uuid,p_callee_id uuid,p_room text,p_mode text,p_expires_at timestamptz
) returns setof public.call_sessions
language sql security definer set search_path=''
as $function$ select * from public.call_sessions where false $function$;
grant execute on function public.start_call_session(uuid,uuid,text,text,timestamptz) to authenticated;

-- Seed historical table-level grants.
grant select, insert, update, delete, truncate, references, trigger
on table public.call_sessions, public.config, public.login_names,
public.paiements, public.statuts, public.prives to authenticated;

-- Seed historical column grants for all three client principals. This catches
-- ACLs inherited from PUBLIC and direct anon grants, not only authenticated.
grant update (caller_id, callee_id, status, expires_at)
on public.call_sessions to authenticated;
grant insert (user_id, username), update (username)
on public.login_names to authenticated;
grant update (status, expires_at), insert (user_id, status)
on public.statuts to authenticated;
grant update (prefs), insert (id, prefs)
on public.prives to authenticated;

grant update (status), insert (room)
on public.call_sessions to anon;
grant update (valeur), insert (cle, valeur)
on public.config to anon;
grant update (username), insert (user_id, username)
on public.login_names to public;
grant update (status), insert (user_id, status)
on public.paiements to anon;
grant update (expires_at), insert (user_id, status)
on public.statuts to public;
grant update (prefs), insert (id, prefs)
on public.prives to anon;

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at) values
 ('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003','test-room-accept','audio','pending',now()+interval '90 seconds'),
 ('70000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000005','test-room-deny','audio','pending',now()+interval '90 seconds');
