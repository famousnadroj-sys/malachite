-- Keep the founder finance ledger inaccessible to direct client roles.
-- The intended read path is the admin-checked SECURITY DEFINER RPC layer.
ALTER TABLE private.founder_finance_ledger ENABLE ROW LEVEL SECURITY;

-- No policies are intentionally created for anon/authenticated.
-- Service-side maintenance and the guarded RPC functions remain the only supported access paths.
