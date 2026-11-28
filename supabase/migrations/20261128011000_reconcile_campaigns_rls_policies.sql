-- Sponsored campaigns are retired from the Malachite launch scope.
-- Keep RLS enabled, remove any legacy client policies, and close browser grants.
-- This deliberately does not restore public campaign discovery or admin CRUD.
alter table public.campagnes enable row level security;

drop policy if exists campagnes_public_read_active on public.campagnes;
drop policy if exists campagnes_admin_insert on public.campagnes;
drop policy if exists campagnes_admin_update on public.campagnes;
drop policy if exists campagnes_admin_delete on public.campagnes;

revoke all privileges on table public.campagnes from public, anon, authenticated;
