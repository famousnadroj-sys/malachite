-- Repair a staging schema drift: the original recorded call-provider migration
-- predates its RLS statement. Keep this defense-in-depth assertion forward-only.
alter table private.call_provider_config enable row level security;
revoke all privileges on table private.call_provider_config from public, anon, authenticated;
