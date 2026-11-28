-- Revoke authenticated mutations that the Malachite client never performs.
-- Keep only the write operations used by the current UI contract.
revoke update, delete on table public.avis_site from authenticated;
revoke delete on table public.avis_match from authenticated;
revoke delete on table public.rendez_vous from authenticated;
revoke delete on table public.signalements from authenticated;
revoke insert, delete on table public.user_notifications from authenticated;
