create schema if not exists auth;
create or replace function auth.uid()
returns uuid language sql stable
as $uid$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $uid$;

-- Minimal production-shaped fixture: the existing status-transition guard
-- is installed first, then the new expiry guard is applied by the workflow.
create schema if not exists private;

create table public.blocages(user_id uuid not null,cible uuid not null,primary key(user_id,cible));
create table public.suspensions(user_id uuid primary key);

create table public.paiements(offre text not null,code text,statut text not null,entitlement_expires_at timestamptz,reviewed_at timestamptz,created_at timestamptz not null default now());

create table public.call_sessions(
 id uuid primary key,
 caller_id uuid not null,
 callee_id uuid not null,
 room text not null,
 mode text not null,
 status text not null default 'pending',
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 ended_at timestamptz
);

create or replace function private.guard_call_session_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if new.caller_id<>old.caller_id or new.callee_id<>old.callee_id
    or new.room<>old.room or new.mode<>old.mode
    or new.created_at<>old.created_at then
  raise exception 'call_session_immutable_fields';
 end if;
 if old.status in ('rejected','ended','expired') then
  raise exception 'call_session_closed';
 end if;
 if old.status='pending' and new.status not in ('accepted','rejected','ended','expired') then
  raise exception 'invalid_call_transition';
 end if;
 if old.status='accepted' and new.status<>'ended' then
  raise exception 'invalid_call_transition';
 end if;
 if new.status in ('ended','rejected','expired') then
  new.ended_at=now();
 end if;
 return new;
end
$$;

create trigger guard_call_session_update
before update on public.call_sessions
for each row execute function private.guard_call_session_update();

-- Minimal provider configuration and participant guards for isolated RPC tests.
create table private.call_provider_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  disabled_since timestamptz default now()
);
insert into private.call_provider_config(singleton,enabled) values (true,true);
create or replace function private.is_suspended(p_user_id uuid)
returns boolean language sql stable set search_path='' as $fn$ select exists(select 1 from public.suspensions where user_id=p_user_id) $fn$;
create or replace function private.is_blocked_with(p_other_user_id uuid)
returns boolean language sql stable set search_path='' as $fn$ select exists(select 1 from public.blocages where (user_id=auth.uid() and cible=p_other_user_id) or (user_id=p_other_user_id and cible=auth.uid())) $fn$;
create or replace function public.call_provider_is_enabled()
returns boolean language sql stable security definer set search_path=''
as $fn$ select exists(select 1 from private.call_provider_config where singleton=true and enabled=true) $fn$;

-- Authenticated test role used by the participant-transition assertions.
DO $roles$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'CREATE ROLE authenticated'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'CREATE ROLE anon'; END IF;
END $roles$;
GRANT USAGE ON SCHEMA public, private, auth TO authenticated;
grant select, update on public.call_sessions to authenticated;

create role service_role;
grant usage on schema public, private, auth to service_role;
