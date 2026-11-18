-- Malachite security hardening (prepared, NOT applied to the live database)
-- Target project: tscsmemsvgacqioncash
-- Baseline: public schema inspected on 2026-11-18.
-- Review and test this migration against a staging clone before production.

begin;

-- Anonymous users do not use the public application data API before login.
-- RLS remains enabled on all public tables; this removes unnecessary SQL privileges.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Authenticated users should never receive table-level bypass capabilities.
-- Keep ordinary CRUD grants intact; row access remains controlled by existing RLS.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- The following SECURITY DEFINER functions are not needed by anonymous visitors.
-- Preserve authenticated access only for functions called by the current client.
revoke execute on function public.contact_de(uuid) from public, anon, authenticated;

revoke execute on function public.est_match(uuid) from public, anon, authenticated;

revoke execute on function public.est_premium(uuid) from public, anon, authenticated;

-- Trigger/event-trigger functions must not be callable through the public RPC API.
-- Their existing database triggers/event trigger continue to invoke them.
revoke execute on function public.limite_messages() from public, anon, authenticated;
revoke execute on function public.limite_rdv() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Payment approval stays callable by authenticated sessions because the function
-- itself checks the administrator email in the JWT. Anonymous execution is removed.
revoke execute on function public.traiter_paiement(bigint, boolean) from public, anon, authenticated;

-- Allow only the configured administrator to read the reports in the Admin UI.
drop policy if exists "admin voit signalements" on public.signalements;
create policy "admin voit signalements"
on public.signalements
for select
to authenticated
using ((select auth.jwt() ->> 'email') = 'famousnadroj@gmail.com');

commit;
