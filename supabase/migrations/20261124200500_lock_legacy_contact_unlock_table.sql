-- Legacy contact-unlock rows may still be honored by the guarded contact RPC,
-- but members must not be able to grant themselves access by writing this table.
revoke all privileges on table public.deblocages from anon, authenticated;
