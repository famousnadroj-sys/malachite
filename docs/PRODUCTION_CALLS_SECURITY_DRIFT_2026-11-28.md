# Production call-session security drift — 2026-11-28

## Evidence (read-only checks)

Project checked: production Supabase ref `tscsmemsvgacqioncash`.
Comparison project: staging ref `sbawknyxcjslvhknomkd`.

Production catalog checks returned:

- `authenticated` has table-level SELECT, INSERT, UPDATE and DELETE on `public.call_sessions`.
- `authenticated` can UPDATE `room`, `caller_id`, `callee_id`, and `expires_at` columns directly.
- The production `start_call_session(uuid,uuid,text,text,timestamptz)` function is SECURITY DEFINER, but still accepts a room name between 12 and 100 characters and expiry up to 3 minutes. It checks premium/paid entitlement, reciprocal match and blocking, but does not check the private JaaS provider switch.
- Production RLS policies limit reads/updates to participants and inserts to paid matched users, but they do not replace column-level/table privilege revocation or the provider authentication gate.
- Staging has already revoked direct INSERT/UPDATE/DELETE on `call_sessions`; the staging participant SELECT policy also rejects suspended or blocked participants.
- Production migration ledger has 65 entries and staging has 126, with no shared migration version. This is migration-history drift, not a safe basis for replaying staging migrations into production.

## Candidate remediation present in PR #158

The candidate includes a fail-closed call provider migration, a guarded call-session status RPC, immutable call identity/state transition protections, and revocation of direct client table writes. It intentionally leaves secure calls disabled until JaaS credentials and participant-specific JWT issuance are configured and verified.

## Release gate

1. Do not replay staging's migration history into production.
2. Generate a production-specific forward-only migration after comparing the live schema and every dependency.
3. Export and verify a recoverable DB/Auth/Storage backup before any production DDL.
4. Apply the call security migration as a controlled release, then verify authenticated users cannot direct INSERT/UPDATE/DELETE and cannot rewrite room/participant/expiry fields.
5. Confirm the existing client build is compatible with the narrow RPCs before rollout; otherwise deploy coordinated frontend + database changes.
6. Keep calls unavailable until a two-account test proves private JaaS rooms, participant tokens, expiry, block/suspension enforcement and call end behavior.
7. Run negative tests as non-owner users and confirm service-role behavior separately.

This document records catalog observations only. No production schema, data, secrets, payment configuration, or deployment was changed during the audit.


## Additional Supabase advisor snapshot (2026-11-28 17:59 UTC)

Production security advisor reported:

- One externally callable `SECURITY DEFINER`: `public.get_malachite_referrer_preview(uuid)` callable by `anon`.
- Nine `SECURITY DEFINER` functions callable by `authenticated`, including admin referral and founder-finance RPCs, match RPCs, referrer preview, and `start_call_session`. Some functions may perform internal authorization, but effective EXECUTE grants and authorization predicates must be reviewed individually; do not treat the advisor warning as proof of data exposure.
- Leaked-password protection is reported disabled/unavailable in the current Auth configuration.
- Twelve RLS-enabled tables have no policies. This can be intentional for private/internal tables only if API grants are also absent; verify effective grants and service-role-only access.

Performance advisor reports 18 unused indexes. Do not drop them based on this snapshot alone: the usage window may be short and some indexes support infrequent security/admin flows.

These advisor results are additional release gates. No advisor finding was auto-fixed in production.


## Function-body review

A read-only `pg_get_functiondef` review confirmed:

- `founder_business_overview`, `founder_finance_summary`, and `admin_malachite_referrals` explicitly require a signed-in user and `private.is_admin()`; their SECURITY DEFINER advisor warnings are not, by themselves, evidence that non-admin data can be read.
- `get_malachite_referrer_preview(uuid)` in production filters out private profiles but does not currently filter suspended profiles or a block relationship. The candidate migration `20261127230000_harden_public_referrer_preview.sql` adds suspension and authenticated-viewer block checks and returns only first name/username.
- `start_call_session` requires authentication, entitlement, reciprocal match and block checks, but production still has permissive room/expiry validation and no secure provider gate. Candidate migrations address this by gating creation on private provider configuration and revoking direct client DML.
- The match RPC wrappers delegate to `private.*` functions; their internal authorization/data projection must be validated in the migration test suite rather than inferred from their public wrapper alone.
