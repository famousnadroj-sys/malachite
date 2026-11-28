# Production / staging migration history reconciliation

Audit date: 2026-11-27
Repository candidate: 37e8a0acdf8a5cab5e8d3bd3a3ca5ae9e5c3abcb
Production Supabase project: tscsmemsvgacqioncash
Staging Supabase project: sbawknyxcjslvhknomkd

## Read-only evidence

- Production migration history: 65 entries; latest version 20261124122733 (account_deletion_fk_cleanup).
- Staging migration history: 106 entries; latest version 20261127082520 (restrict_profile_writes_to_presence_only).
- Exact migration version intersection: 0.
- Production versions absent from staging: 65.
- Staging versions absent from production: 106.
- Staging contains a schema-only baseline/snapshot series beginning 20261122201248, followed by test/runtime and forward hardening migrations. Its migration ledger is not a continuation of the production ledger.

## Decision

Do not replay staging migrations into production or production migrations into staging by timestamp/order. There is no common migration anchor, and staging contains schema-only/test baselines. Treat the two environments as independently provisioned until a canonical baseline and schema diff are produced.

## Safe next steps

1. Take and verify a production backup; record schema, extensions, RLS policies, grants, functions, triggers, storage policies and cron jobs.
2. Create a disposable database from that backup (or a clean canonical schema baseline).
3. Generate a structural diff against the candidate schema, excluding data and secrets.
4. Build a forward-only, idempotent production reconciliation migration from the diff; do not rewrite historical migration rows.
5. Run all SQL security fixtures plus the full migration sequence against the disposable copy.
6. Require explicit owner approval before production apply. Apply in a maintenance window, then verify effective grants, RLS, cron, Edge Function versions, and critical user flows.

No production or staging migration was applied during this audit.
