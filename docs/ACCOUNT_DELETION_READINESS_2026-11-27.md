# Malachite — account deletion readiness (27 November 2026)

Status: **BLOCKED — no production deletion executed**

## Live read-only findings

Production project: `tscsmemsvgacqioncash`.

- PostgreSQL catalog found no public RPC whose name indicates account/user deletion.
- Supabase Edge Function inventory returned: `malachite-ai-manager`, `malachite-ai-worker`, `username-login`, `admin-user-moderation`, `malachite-admin-push`, and `malachite-ad-creative`. No dedicated account-deletion Edge Function is deployed.
- The production migration ledger ends at `20261124122733 account_deletion_fk_cleanup`. Exact live catalog checks confirm the migration's three administrative `ON DELETE SET NULL` references are present: `campagnes.cree_par`, `demandes_support.traite_par`, and `signalements.traite_par`. This is audit-reference preparation, not a deletion endpoint.
- Production has many existing foreign keys to `auth.users`, including profiles/private profile, calls, blocks, receipts, notifications, support user, statuses, suspensions, referrals, login names, admin push subscriptions, and the three administrative SET NULL references. Auth's own identity/session tables also cascade.
- The live production FK inventory still shows no FK for these application relations: message participant columns (`messages.de/a`), rendez-vous participants, Match vote participants (`avis_match.user_id/autre`), site-review author (`avis_site.user_id`), report subject/reporter (`signalements.de/profil`), and payment submitter (`paiements.user_id`). These require explicit deletion/anonymization/retention handling; do not infer that the rows are absent.
- A previous broad information_schema query missed existing constraints. The current conclusion is based on direct `pg_constraint` inspection, including exact FK definitions.
- Integrity recheck for the ten FK-less application reference columns above found **0 orphaned Auth IDs** at the snapshot time. This is a point-in-time integrity result, not a guarantee against future orphaning; no FK or data cleanup was added.
- No account was deleted and no production schema/data was modified.

## Required design before enabling deletion

1. Add a dedicated authenticated server-side deletion endpoint; never expose the Supabase service-role key to the browser.
2. Require a fresh authenticated session and explicit confirmation; reject admin/self-protection cases according to an approved policy.
3. Use the existing draft `docs/ACCOUNT_DELETION_RETENTION_POLICY_DRAFT.md` as a starting point, then approve the table-by-table treatment of profiles, messages, Match, blocks, reports, support, notifications, call records, payment submissions/receipts, and audit trails.
4. Preserve necessary payment/moderation evidence through a documented retention or anonymization policy; do not silently cascade-delete financial or safety evidence.
5. Delete or anonymize user-owned rows in a controlled transaction where possible; handle Storage objects separately with idempotent cleanup and retry tracking.
6. Delete the Auth user only after dependent data actions are verified; make retries safe and log a minimal non-sensitive audit result.
7. Test owner-only access, cross-user denial, blocked/suspended accounts, partial failure/retry, Storage cleanup, and retained evidence in an isolated database.
8. Add an end-to-end deletion test and recovery/rollback plan before production activation.

## Release gate

Do not claim account deletion is complete until the endpoint is deployed, the retention matrix is approved, isolated tests pass, and the owner has reviewed the production rollout. This document records read-only findings and a safe implementation plan only.
