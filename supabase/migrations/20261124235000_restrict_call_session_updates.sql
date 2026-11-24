-- Participants may only change call status; session identity and expiry are server-controlled.
revoke update on table public.call_sessions from authenticated;
grant update (status) on table public.call_sessions to authenticated;
