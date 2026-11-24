# Malachite — Phase A verification report

Date: 2026-11-24  
Branch: `security/account-deletion-design-v1`  
Commit verified by CI: `6515502a063586a6bc7683f2e22f809d4fd863e3`

## Verified

GitHub Actions run [45492635091](https://github.com/famousnadroj-sys/malachite/actions/runs/45492635091) completed with conclusion **success**. Its PostgreSQL 17 disposable job completed all steps, including the contract suite and Phase A draft executed twice.

The Phase A fixture verifies:
- canonical pair mapping for messages in both directions;
- one stable thread per unordered pair;
- six memberships for three distinct pairs;
- profile-less but valid Auth users are not silently excluded;
- self-addressed rows remain unmapped pending classification;
- call messages remain attached to their underlying user pair;
- authenticated users cannot create threads, memberships, or pair-index rows directly;
- RLS limits thread, pair-index, and membership reads to the current user;
- deleting one Auth identity cascades its pair-index row and membership, but leaves the stable thread and the other member's membership;
- the new `sender_id` FK becomes null when its Auth identity is deleted, while the legacy `de` column is deliberately unchanged in this compatibility phase.

## Important limits — not ready for production

The SQL file in `docs/ACCOUNT_DELETION_PHASE_A_MIGRATION_DRAFT.sql` is a **draft** and must not be applied to production.

The tests currently validate the additive schema and the new tables' access rules. They do **not** prove that the whole live application is ready to use the new model. Before any production migration, the following work remains mandatory:

1. Add and test a server-side write path that assigns `conversation_id` and `sender_id` for every new message. The current legacy trigger and client still write `de/a`.
2. Replace/extend message SELECT RLS so the surviving member can read retained messages through active `conversation_members`, without relying on a deleted Auth UUID in legacy `de/a`.
3. Adapt receipt creation/read/update policies and notification triggers to the new sender/thread model; explicitly test deletion of sender and recipient.
4. Adapt frontend conversation list, pagination, send, unread counts, realtime subscriptions, and message media paths. No frontend migration is included in Phase A.
5. Classify the two self-addressed production rows and verify the three messages whose sender has Auth but no profile. Preserve them; do not discard them by assumption.
6. Design Storage cleanup using the Storage API, verify per-user ownership and retention, and handle private media without breaking the surviving participant's conversation.
7. Implement an idempotent, audited account-deletion Edge Function with session revocation, pending-state enforcement, Auth deletion last, retry/recovery, and clear retention handling for payments, reports, moderation, and legal records.
8. Run a full staging rehearsal with production-like schema and representative anonymized data, including rollback and recovery checks.

## Current decision

**Continue in staging only. No production migration, no function deployment, no account deletion, and no PR merge.** The passing CI result establishes that the draft contracts execute; it does not certify production readiness or end-to-end deletion behavior.
