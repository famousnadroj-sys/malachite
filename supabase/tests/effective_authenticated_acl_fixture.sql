do $$
begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $$;

create schema auth;
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.call_sessions(
  id uuid primary key, caller_id uuid, callee_id uuid, room text, mode text,
  status text, expires_at timestamptz
);
create table public.config(cle text, valeur text);
create table public.login_names(user_id uuid, username text);
create table public.paiements(id bigint, user_id uuid, status text, receipt_path text);
create table public.statuts(user_id uuid, status text, expires_at timestamptz);
create table public.prives(id uuid, prefs jsonb);

-- Simulate the legacy SECURITY DEFINER call-creation RPC and its client grant.
create or replace function public.start_call_session(
  p_id uuid,p_callee_id uuid,p_room text,p_mode text,p_expires_at timestamptz
) returns setof public.call_sessions
language sql security definer set search_path=''
as $function$ select * from public.call_sessions where false $function$;
grant execute on function public.start_call_session(uuid,uuid,text,text,timestamptz) to authenticated;

-- Seed both table-level and column-level ACLs to prove the migration removes
-- historical grants rather than only fixing a fresh schema.
grant select, insert, update, delete, truncate, references, trigger
on table public.call_sessions, public.config, public.login_names,
public.paiements, public.statuts, public.prives to authenticated;
grant update (caller_id, callee_id, status, expires_at)
on public.call_sessions to authenticated;
grant insert (user_id, username), update (username)
on public.login_names to authenticated;
grant update (status, expires_at), insert (user_id, status)
on public.statuts to authenticated;
grant update (prefs), insert (id, prefs)
on public.prives to authenticated;

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at) values
 ('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003','test-room-accept','audio','pending',now()+interval '90 seconds'),
 ('70000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000005','test-room-deny','audio','pending',now()+interval '90 seconds');
