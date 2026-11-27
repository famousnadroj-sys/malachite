do $roles$
begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end
$roles$;

create table public.statuts (
  user_id uuid primary key,
  premium_until timestamptz
);

create or replace function public.est_premium(u uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select premium_until > now() from public.statuts where user_id = u),
    false
  )
$$;

revoke all on function public.est_premium(uuid) from public, anon, authenticated;
