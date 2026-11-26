create schema if not exists auth;
create or replace function auth.uid()
returns uuid language sql stable
as $uid$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $uid$;

-- Minimal production-shaped fixture: the existing status-transition guard
-- is installed first, then the new expiry guard is applied by the workflow.
create schema if not exists private;

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

-- Authenticated test role used by the participant-transition assertions.
do $ begin
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $;
grant usage on schema public, private, auth to authenticated;
grant select, update on public.call_sessions to authenticated;
