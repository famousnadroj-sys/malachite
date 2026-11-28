-- Sponsored campaigns are retired from the Malachite launch scope.
-- Keep RLS enabled, remove legacy client policies, and close browser grants.
-- This deliberately does not restore public campaign discovery or admin CRUD.
alter table public.campagnes enable row level security;

drop policy if exists campagnes_public_read_active on public.campagnes;
drop policy if exists campagnes_admin_insert on public.campagnes;
drop policy if exists campagnes_admin_update on public.campagnes;
drop policy if exists campagnes_admin_delete on public.campagnes;

do $$
declare r record;
begin
  for r in
    select column_name, privilege_type, grantee
    from information_schema.column_privileges
    where table_schema='public'
      and table_name='campagnes'
      and grantee in ('PUBLIC','anon','authenticated')
  loop
    execute format(
      'revoke %s (%I) on table public.campagnes from %s',
      r.privilege_type,
      r.column_name,
      case when r.grantee='PUBLIC' then 'PUBLIC' else quote_ident(r.grantee) end
    );
  end loop;
end
$$;

revoke all privileges on table public.campagnes from public, anon, authenticated;
