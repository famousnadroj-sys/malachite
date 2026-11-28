# Malachite — pg_net privilege review (27 Nov 2026)

Environments: production `tscsmemsvgacqioncash`, staging `sbawknyxcjslvhknomkd`. Read-only catalog inspection only.

## Live catalog facts

- `pg_net` is installed; its HTTP functions are in schema `net` (extension namespace metadata reports `public`).
- In both projects, `anon` and `authenticated` have effective USAGE on `net` and EXECUTE on the 12 installed `pg_net` functions. These are Supabase platform/default grants, not grants created by Malachite.
- `anon`, `authenticated`, and `service_role` are `NOLOGIN` in both projects. Only the trusted `postgres` role and platform owner roles can connect directly.
- Supabase's current official pg_net documentation says `net` is not exposed through the Data API by default and is a protected schema; anon/publishable keys cannot access its objects through PostgREST unless API configuration is misconfigured. Supabase's current KB also explains that the `supabase_admin` owner applies these grants and revoking them as `postgres` has no effect. Therefore the previous framing of these default grants as a confirmed client HTTP vulnerability was too strong.
- Production cron jobs `malachite-ai-ops-worker` (every 15 min) and `malachite-admin-payment-push-batch` (every minute) use `net.http_post` as `postgres`. Staging has the payment-push cron. Preserve this backend path.
- Production and staging role configs show no explicit `pgrst.db_schemas` override on `authenticator`; the exact Dashboard exposed-schema list is not readable through the SQL connector.
- No evidence of an external client successfully invoking `net.http_*` was found in this audit. No exploit test was performed.

## Correct conclusion

**Not a confirmed launch blocker by itself.** Do not keep attempting per-project REVOKE on the platform-owned `net` objects, do not drop/recreate `pg_net`, and do not move it blindly. That could break cron/webhooks and is not the supported mitigation.

Owner-side verification only:
1. In Supabase Dashboard/API settings, confirm `net` is not listed as an exposed schema. Supabase documents `net` as protected from normal Data API exposure; if the project shows a nonstandard override, resolve it with Supabase support/official configuration path.
2. Keep untrusted client roles `NOLOGIN`; do not create custom LOGIN roles inheriting the PUBLIC grants.
3. Preserve the existing `postgres` cron access and verify both worker/push crons continue succeeding.
4. Treat the advisor warning about pg_net being installed in `public` as a platform extension placement warning, not a reason to relocate/drop the extension without a reviewed maintenance plan.

## Evidence and limits

This report corrects the earlier version, which over-weighted the default EXECUTE grants and proposed an unsupported per-project revoke. No grants, extension, cron, secret, or project setting was changed. Official reference pages:
- https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16
- https://supabase.com/docs/guides/database/extensions/pg_net


## Confirmatory catalog recheck — 27 Nov 2026, 13:47 UTC

The fresh live catalog query confirms the environment difference precisely:
- Production: extension catalog reports `pg_net` installed in schema `extensions`; its callable HTTP functions resolve in schema `net`. Cron inventory includes AI worker every 15 minutes, admin payment push every minute, and entitlement expiry every five minutes.
- Staging: extension catalog reports `pg_net` installed in `public`; HTTP functions resolve in `net`. Its cron inventory includes payment push every five minutes and username-login cleanup daily.
- In both environments, anon/authenticated have effective EXECUTE on `net.http_get/http_post/http_delete` and USAGE on `net`. This is not proof of REST exposure: schema allow-list configuration must be checked in Dashboard; Supabase's documented default is that `net` is not exposed.

Production currently stores 66 objects in four non-empty private buckets (31 chat-media, 2 receipts, 9 legacy photos, 24 profile photos), totalling 70,341,882 bytes. The two campaign buckets are empty. This refresh is inventory only; it does not satisfy export/checksum/restore certification.
