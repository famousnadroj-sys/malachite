-- Restore only the column-level mutations required by the current Malachite UI.
-- RLS policies remain the row-level authority for each write.
revoke update on table public.avis_match from authenticated;
grant update (autre, ok) on table public.avis_match to authenticated;

revoke update on table public.rendez_vous from authenticated;
grant update (statut) on table public.rendez_vous to authenticated;

revoke update on table public.signalements from authenticated;
grant update (statut, traite_par, traite_le) on table public.signalements to authenticated;

revoke update on table public.message_receipts from authenticated;
grant update (read_at) on table public.message_receipts to authenticated;

revoke update on table public.user_notifications from authenticated;
grant update (read_at) on table public.user_notifications to authenticated;
