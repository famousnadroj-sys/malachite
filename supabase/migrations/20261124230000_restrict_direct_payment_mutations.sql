-- Payment status and deletion are performed by the guarded admin RPC,
-- not by direct client table writes. Keep client access read/submit only.
revoke update, delete on table public.paiements from authenticated;
