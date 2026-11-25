-- Only the validated SECURITY DEFINER RPC may create call sessions.
-- Clients may read their own sessions and update status only; they cannot
-- insert duplicate sessions directly or delete audit/session records.
revoke insert, delete on table public.call_sessions from authenticated;
drop policy if exists "paid matched members can call" on public.call_sessions;
