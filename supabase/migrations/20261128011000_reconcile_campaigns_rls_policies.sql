-- Production had RLS enabled on public.campagnes but no policies, so the
-- authenticated client could not read active campaigns or manage them as admin.
-- Reconcile with the already-verified staging policy contract.
alter table public.campagnes enable row level security;

drop policy if exists campagnes_admin_delete on public.campagnes;
drop policy if exists campagnes_admin_insert on public.campagnes;
drop policy if exists campagnes_admin_update on public.campagnes;
drop policy if exists campagnes_public_read_active on public.campagnes;

create policy campagnes_public_read_active
on public.campagnes for select to authenticated
using (
  (statut = 'active' and debut <= now() and (fin is null or fin > now()))
  or (select private.is_admin())
);

create policy campagnes_admin_insert
on public.campagnes for insert to authenticated
with check (
  (select private.is_admin())
  and cree_par = (select auth.uid())
);

create policy campagnes_admin_update
on public.campagnes for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy campagnes_admin_delete
on public.campagnes for delete to authenticated
using ((select private.is_admin()));
