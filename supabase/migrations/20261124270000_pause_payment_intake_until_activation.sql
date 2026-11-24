-- Payment intake remains closed until the owner confirms the dedicated
-- receiving SIM, final Premium/Boost prices and the secure call provider.
-- Existing payment history and guarded admin review are preserved.
revoke insert on table public.paiements from public, anon, authenticated;

drop policy if exists "declarer un paiement" on public.paiements;
drop policy if exists "payment receipts owner upload" on storage.objects;

-- The config table currently contains Mobile Money destinations. The browser
-- no longer needs them while payment intake is paused; hide the table entirely
-- from client roles so authenticated members cannot enumerate those values.
revoke all on table public.config from public, anon, authenticated;
drop policy if exists "voir config" on public.config;
