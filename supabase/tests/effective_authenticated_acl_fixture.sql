do $$
begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
end $$;

create table public.call_sessions(id uuid, caller_id uuid, callee_id uuid, status text, expires_at timestamptz);
create table public.config(cle text, valeur text);
create table public.login_names(user_id uuid, username text);
create table public.paiements(id bigint, user_id uuid, status text, receipt_path text);
create table public.statuts(user_id uuid, status text, expires_at timestamptz);
create table public.prives(id uuid, prefs jsonb);

-- Seed both table-level and column-level ACLs to prove the migration removes
-- inherited historical grants rather than only fixing a fresh schema.
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
