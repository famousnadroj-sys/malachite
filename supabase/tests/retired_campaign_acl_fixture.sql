do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end
$$;
create table public.campagnes(id bigint primary key);
alter table public.campagnes enable row level security;
grant select, insert, update, delete on public.campagnes to anon, authenticated;
