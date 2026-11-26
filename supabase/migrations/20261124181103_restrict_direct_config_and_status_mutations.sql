-- Client reads for payment-operator labels and public entitlement badges remain available.
-- All writes to these tables are handled by trusted server-side workflows.
revoke insert, update, delete on table public.config from authenticated;
revoke insert, update, delete on table public.statuts from authenticated;
