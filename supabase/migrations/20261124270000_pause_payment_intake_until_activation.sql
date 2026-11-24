-- Payment intake remains closed until the owner confirms the dedicated
-- receiving SIM, final Premium/Boost prices and the secure call provider.
-- Existing payment history and guarded admin review are preserved.
revoke insert on table public.paiements from public, anon, authenticated;

drop policy if exists "declarer un paiement" on public.paiements;
drop policy if exists "payment receipts owner upload" on storage.objects;

-- Calls are intentionally unavailable until a secure provider and token
-- issuance backend are configured. Existing call history remains readable.
drop policy if exists "paid matched members can call" on public.call_sessions;
drop policy if exists "call participants can update" on public.call_sessions;
revoke insert, update, delete on table public.call_sessions from public, anon, authenticated;

-- The config table currently contains Mobile Money destinations. The browser
-- no longer needs them while payment intake is paused; hide the table entirely
-- from client roles so authenticated members cannot enumerate those values.
revoke all on table public.config from public, anon, authenticated;
drop policy if exists "voir config" on public.config;
