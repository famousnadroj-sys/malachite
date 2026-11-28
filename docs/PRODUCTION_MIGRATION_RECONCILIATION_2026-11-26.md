# Migration reconciliation — live evidence snapshot (26 Nov 2026)

Project: `tscsmemsvgacqioncash`, production PostgreSQL 17.12.
Production migration ledger: 65 rows; latest `20261124122733 account_deletion_fk_cleanup`.
Repository `main`: 78 migration SQL files.

## Important versioning rule

Do not compare filename timestamp prefixes directly to `schema_migrations.version`. Applied versions are deployment-time identifiers and can differ from current repository filename prefixes. The ledger's logical migration names also differ from some current filenames because migrations have been renamed or consolidated. Therefore neither “26 files have later timestamps” nor “78 files minus 65 ledger rows” is an exact pending-migration count.

A production-equivalent isolated restore is still required to replay the full migration chain. Several historical ledger names do not have a one-to-one filename in the current repository; their effects must be identified from the live schema and repository history before any attempt to rebuild from zero.

## Effects verified in production

| Candidate migration / area | Live evidence | Reconciliation status |
|---|---|---|
| `20261124150000_retire_advertising_surfaces` | Present in production migration ledger as `retire_advertising_surfaces`; both campaign Storage buckets are private | Applied |
| `20261124130000_disable_public_campaign_storage` | Both campaign buckets already private; later retirement migration covers the same public-bucket shutdown | Superseded by applied retirement migration; do not replay blindly |
| `20261124143000_harden_call_session_immutable_fields` | `guard_call_session_update` trigger exists, but its function does not protect `id` or `expires_at` immutability as candidate source specifies | Partial / must reconcile with later state-transition migration |
| `20261124140129_enforce_private_profile_public_projection` | Its data-rewriting trigger is absent; later owner-only migration removes this intermediate approach | Superseded; do not apply as a standalone final state |
| `20261124142000_restrict_private_profile_photo_reads` | Legacy `profile photos read` policy still exists; final owner-only/public-listed-path policy is absent | Not at final desired state; superseded by owner-only and avatar policy migrations |
| `20261124150100_secure_private_profile_access` | Current profile SELECT policy does not filter `profile_private=false`; photo policy is also broad | Not applied / urgent privacy gap |
| `20261124170000_harden_call_and_referrer_access` | Provider switch, participant status RPC and token eligibility RPC do not exist in production; `start_call_session` remains callable | Not applied / urgent call-security gap |
| `20261124181103_restrict_direct_config_and_status_mutations` | Authenticated retains direct config/statuts write grants | Not applied |
| `20261124181403_limit_public_config_reads_to_payment_operators` | Config SELECT policy remains `true` | Not applied; current keys are only Airtel and Orange |
| `20261124181825_secure_public_private_function_wrappers` | Target wrapper functions remain SECURITY INVOKER in production | Not applied; review each wrapper's authorization before applying |
| `20261124182913_remove_unapproved_prices_from_expiry_notifications` | User-triggered expiry function still contains USD 3 / USD 1 / USD 0.50 price text | Not applied |
| `20261124183430_remove_unapproved_prices_from_scheduled_expiry_notifications` | Scheduled expiry function still contains the same old price text | Not applied |
| `20261124190000_harden_call_and_appointment_participant_access` | Live call and appointment policies lack the final suspension/block checks shown in candidate source | Not at desired state |
| `20261124200100_limit_entitlement_status_visibility` | `statuts` SELECT policy remains `true`; one authenticated test context can read 3 rows | Not applied / privacy gap |
| `20261124200500_lock_legacy_contact_unlock_table` | RLS has only an owner SELECT policy; direct grants remain but writes have no matching RLS policy | RLS currently blocks member writes; revoke grants remains defense-in-depth |
| `20261124210000_restore_authenticated_profile_reads` | Authenticated has column-level SELECT on profile fields; table-level grant is absent | Partial / reconcile with later profile ACL cutover |
| `20261124230000_restrict_direct_payment_mutations` | Authenticated retains UPDATE and DELETE grants on `paiements` | Not applied |
| `20261124235000_restrict_call_session_updates` | Authenticated retains broad UPDATE grant on `call_sessions` | Not applied |
| `20261124240000_revoke_retired_campaign_table_access` | Authenticated retains CRUD grants on `campagnes`; RLS has no policies and currently denies row access | Not applied; unnecessary grants remain |
| `20261124241000_restrict_direct_call_session_writes` | Authenticated retains INSERT and DELETE grants on `call_sessions` | Not applied |
| `20261124250000_enforce_profile_age_server_side` | Live `save_my_profile` only rejects a non-null age below 18; missing and over-100 ages are not rejected | Not applied / age-enforcement gap |
| `20261124260000_restrict_profile_writes_to_trusted_rpc` | Live `save_my_profile` is SECURITY INVOKER; authenticated has direct profile write grants | Not applied / profile-write gap |
| `20261124270000_pause_payment_intake_until_activation` | Authenticated payment INSERT and receipt-upload policies remain active | Not applied; activation/pause is an owner launch decision |
| `20261125141500_normalize_authenticated_table_acl` | Broad authenticated grants remain on call_sessions, config, paiements, statuts and profile/private tables | Not applied |
| `20261125150000_allow_published_public_profile_avatar_reads` | Current photo policy does not check the public avatar `imagePath` and listed photo paths | Not applied |

## New PR #158 candidate migrations

The candidate adds 13 migration files beyond the current `main` baseline:
- `20261126121000_harden_call_session_state_transitions.sql`
- `20261126130000_reapply_profile_rpc_cutover.sql`
- `20261126140000_fail_closed_calls_until_jaas_auth.sql`
- `20261126150000_pause_call_pass_sales_until_jaas_activation.sql`
- `20261126160000_harden_chat_media_read_access.sql`
- `20261126170000_preserve_call_pass_time_while_provider_disabled.sql`
- `20261126180000_harden_referrer_preview_visibility.sql`
- `20261126190000_reassert_entitlement_status_visibility.sql`
- `20261126195000_reassert_private_profile_access.sql`
- `20261126210000_atomic_username_login_throttle.sql`
- `20261126220000_harden_message_suspension_access.sql`
- `20261126221000_restrict_founder_finance_summary.sql`
- `20261126230000_revoke_retired_campaign_table_access.sql`

These are source changes only. They are tested in disposable PostgreSQL fixtures, not applied to production.

## Activation / deployment constraints

1. Do not replay the 26 timestamp-later files as a batch.
2. Preserve applied ledger records and reconcile renamed/consolidated migrations by their logical effect.
3. Apply final-state privacy policies without leaving intermediate profile-redaction/photo policies exposed between deployments.
4. Do not apply the payment-intake pause until the owner confirms receiving SIM and launch payment readiness.
5. Do not enable calls until JaaS secrets are configured and two-account negative-path tests pass.
6. Do not deploy any production migration until a real off-site backup and isolated restore are evidenced.

## Current result

Production remains ACTIVE_HEALTHY but is not launch-certified. The latest code candidate passed all 14 isolated Malachite validation jobs, including call-session/JaaS fail-closed checks, call-pass sale and expiry-pause checks, chat-media access checks, age enforcement, private-profile access, entitlement visibility, ACL, payment and account-deletion fixtures. Match isolated PostgreSQL runtime, release integration contract and live Pages verification also passed on the code candidate. Documentation-only follow-up checks are running separately. These are isolated tests, not a full production-equivalent migration replay. No production DDL or data writes were performed during this reconciliation.

## Historical ledger aliases and source gaps

The 65-row production ledger and the 78-file main directory are not one-to-one by filename. A name-normalized comparison against the current candidate branch found 20 ledger entries with no exact current filename. This is an exact-name comparison only; it does not classify the entries as unapplied, because several are historical aliases or consolidated source migrations. Several are clear aliases of current source files and have matching live effects:

| Applied ledger name | Current repository source | Live evidence |
|---|---|---|
| malachite_support_and_payment_operators | support_and_payment_operators | Support/payment operator tables and policies exist |
| malachite_avatar_and_chat_video_types | avatars_and_chat_video | Avatar and chat media fields exist |
| premium_includes_calls_and_entitlement_notifications | premium_includes_calls_notifications | Premium expiry fields and notifications exist |
| malachite_call_policy_performance_indexes | call_policy_performance_indexes | Call indexes and policies exist |
| restrict_notification_updates_to_read_state | restrict_notification_updates | Notification update policy exists |
| private_payment_receipts_additive | private_payment_receipts | Private receipt bucket policies and owner-path constraint exist |
| malachite_ai_manager_access_and_audit | malachite_ai_manager | AI manager audit table and admin RPC exist |
| malachite_ai_autonomous_operations_foundation | ai_autonomous_operations_foundation | AI ops tables and worker exist |

Other historical entries have no exact current source file. Their live effects are partly visible:
- Username login/rate-limit ledger entries: production tables were recovered into candidate migration `20261126205000_reconcile_username_login_tables_from_live.sql`; the candidate removes direct browser access to `login_names` (only validated profile RPC writes and the service-role login Edge Function access it). Atomic throttle function remains `20261126210000_atomic_username_login_throttle.sql`, with the candidate Edge Function source under `supabase/functions/username-login/index.ts`. The original three migration filenames are absent, but final table/function behavior now has tracked source and isolated tests.
- Call URL/media-format ledger entries: the exact historical migration filenames remain absent; the live `public.limite_messages()` function was recovered verbatim into `20261126240000_reconcile_message_media_types_from_live.sql`, including document path validation, call-room format, suspension/block checks and free-chat quota. A dedicated PostgreSQL regression fixture now covers the final guard.
- Payment receipt frontend-follow-up ledger entry: private receipt policies and paiements_receipt_path_owner_check are present.
- AI scheduling/alerts/review ledger entries: worker/run/HMAC/15-minute cron foundation is tracked in `20261120220000_ai_autonomous_operations_foundation.sql`; the final AI settings, alert and human-review schemas are reconstructed in `20261126260000_reconcile_ai_alerts_and_review_queue_from_live.sql` with service-only access and cost-safe fresh-replay default.
- Instant admin payment push ledger entries: the verified final queue/subscription tables, trigger, Vault lookup, immediate signed dispatch and one-minute fallback cron are reconstructed in `20261126250000_reconcile_admin_payment_push_dispatch.sql`; VAPID key material remains external Vault setup.
- admin_audit_private_media: no exact source file or one-to-one live object mapping has been certified.

This means a complete fresh-project replay cannot be certified from the current repository alone. Before restoration is certified, recover the missing historical SQL from a trusted source or create reviewed, idempotent baseline migrations from the live schema and prove them on an isolated restore. Do not invent the missing source and do not mark ledger entries applied based only on matching table names.


## Refreshed inventory and CI evidence — 26 Nov 2026

- Live production ledger re-read: 65 rows; last recorded version `20261124122733` (`account_deletion_fk_cleanup`).
- Candidate branch inventory re-read: 91 migration SQL files (78 on main plus 13 candidate-only files). A second read-only comparison of the 65 production ledger rows against normalized current filenames matched 45 names exactly and left 20 name mismatches for historical alias/source recovery; 46 candidate filenames also have no exact ledger-name match, which is not an apply queue.
- 38 filenames have numeric prefixes later than the last recorded ledger version. This is a **triage list only**, not a pending migration list. Version aliases, renames, consolidations, and already-applied effects prevent timestamp-only classification.
- PR #158 candidate head `4f0e56a0a4c968ca1d5f3c7b5e50f0d9082b321c`: all four workflow groups succeeded on the latest recheck (Malachite validation, Match isolated PostgreSQL runtime, release integration contract, and live Pages verification).
- These checks run against isolated CI fixtures and live Pages checks; they do not prove production migration replay or backup restorability.

### Next safe reconciliation work

For each timestamp candidate, record: (1) logical ledger name match, (2) whether its SQL effect is already present in production, (3) whether a later migration supersedes it, (4) dependencies/order, and (5) whether its SQL is safe to replay. Do not apply migrations by filename timestamp or file-count difference. A full clean replay and restore drill must happen on an isolated production-equivalent target before production deployment.

## Latest candidate verification — 26 Nov 2026

Current PR #158 head: `4f0e56a0a4c968ca1d5f3c7b5e50f0d9082b321c`.

All four workflow groups completed successfully on this head:
- Malachite validation: success.
- Match isolated PostgreSQL runtime: success.
- Release integration contract: success.
- Live Pages verification: success.

The staging integration tests for profile age/ownership, private profile and photo access, chat-media recipient/block/suspension checks, call state/provider fail-closed behavior, finance/admin RPC permissions, username throttling, and paid-call pass time preservation passed and rolled back their fixtures. These remain isolated tests, not a production migration replay.

A read-only production log check also confirmed recent `username-login` requests returned HTTP 200 and Cloudflare supplied `cf_connecting_ip`, which the candidate's rate limiter requires. This verifies header availability for observed requests, not a guarantee for every network path.

Production backup plus isolated restore remains uncertified. Historical source gaps and migration aliases remain unresolved; Auth leaked-password protection is still disabled; JaaS credentials/deployment and two-account private-call tests are absent. The candidate is CI/staging-verified, not production-deployable or launch-certified.

## Additional production findings — 26 Nov 2026, 18:50 UTC

- Read-only PostgreSQL logs show five `save_my_profile` calls returned 403 because production's function is SECURITY INVOKER and authenticated has no SELECT privilege on `profiles`. The candidate's SECURITY DEFINER owner-scoped RPC keeps direct table access restricted; its isolated profile-write tests pass. Do not grant broad SELECT as a workaround.
- The security advisor exposed `founder_finance_summary` to authenticated users without an admin check. The candidate revokes browser-role execution and keeps service_role only; the dedicated PostgreSQL ACL test passes.
- Public username-availability checks now have a separate atomic per-IP throttle in the candidate.
- The AI worker candidate reconciles stale review tasks only after the underlying source has already been resolved by a human. It does not validate payments or send member responses.
- After the live photo-cache release, no new failed signed profile-photo URL requests appeared in the 18:13–18:50 UTC log window. No 5xx Edge/PostgREST requests were found in the last 24-hour log query.

These are candidate fixes or read-only observations. They have not been applied to production.


## Follow-up: exact historical migration filename reconciliation

The four duplicate source prefixes in the repository were matched against the live production migration ledger and renamed in this candidate to the exact recorded versions:

| Production ledger version | Ledger name | Candidate filename |
|---|---|---|
| `20261120074436` | `profile_public_fields_and_presence` | `20261120074436_profile_public_fields_and_presence.sql` |
| `20261120081100` | `paid_jitsi_calls_and_call_signaling` | `20261120081100_paid_jitsi_calls_and_call_signaling.sql` |
| `20261120210548` | `malachite_ai_manager_access_and_audit` | `20261120210548_malachite_ai_manager_access_and_audit.sql` |
| `20261120210922` | `harden_malachite_ai_admin_rpc` | `20261120210922_harden_malachite_ai_admin_rpc.sql` |

This removes the two duplicate migration prefixes without changing SQL bodies or applying anything to production. The validator now points to the reconciled admin-RPC filename. A full replay against a production-equivalent restored database is still required before any production migration push.


## Refresh — current branch and database ledger snapshot, 26 Nov 2026

- Current PR #158 head: `04b1b2dc1ff5ab7a30f3cc0e122c9e40c388d7c5`.
- Production migration ledger was re-read: 65 rows; none of the 14 migration entries touched by PR #158 is recorded in production (normalized logical-name comparison). This does not mean every PR file is new: the PR contains 13 candidate-only migration files plus one update/reapplication of an existing migration path.
- Staging migration ledger was re-read: 72 rows. All 14 PR migration entries are present there by normalized logical name, including the profile RPC cutover, fail-closed call provider, chat-media ACL, entitlement visibility, username throttle, finance RPC restriction and retired-campaign ACL.
- The staging JaaS token issuer is deployed as Edge Function version 1 with platform JWT verification enabled. The provider switch remains false; there are no JaaS credentials configured and no call-session fixtures remain. This is an artifact deployment only, not a successful real JaaS join.
- All four CI workflow groups passed on current head: Malachite validation, Match isolated PostgreSQL runtime, release integration contract, and live Pages verification.
- A fresh aggregate production log query for 26 Nov found 12 profile permission errors and 12 corresponding `save_my_profile` HTTP 403s affecting one authenticated account in the observed log window. This supersedes the earlier smaller log sample noted above; production profile saving is still broken for that account at the time of the query.

Production remains unchanged. The 20 historical ledger aliases/source gaps, missing trusted backup and isolated restore drill, disabled Auth leaked-password protection, and absent JaaS credentials remain release blockers. Do not merge or deploy the migration set to production until those gates are resolved and the release owner explicitly approves the controlled cutover.


## Staging-only schema drift check — 26 Nov 2026

The staging performance advisor reported two unindexed foreign keys on `public.conversation_pair_index.member_high` and `public.messages.sender_id`. Before proposing a production migration, the production catalog was checked: `public.conversation_pair_index` does not exist there, and production `public.messages` does not contain `sender_id`. Those objects/columns are staging baseline artifacts, not production schema. A temporary staging-only index experiment was applied and then both indexes were dropped; the proposed migration was removed from PR #158. Do not promote these indexes or infer production performance defects from this staging-only advisor output.


## Latest audit and validation refresh — 26 Nov 2026

Current PR #158 head: `acae354b89a3b064255cd5e8e155311b933432b7`. All four workflow groups passed on this head: Malachite validation, Match isolated PostgreSQL runtime, release integration contract, and live Pages verification. Staging negative-path checks also passed for non-admin access to founder business overview, admin referrals, moderation, announcement publishing, and duplicate pending-payment review; the transaction rolled back. The staging JaaS issuer remains deployed with JWT verification, but provider is OFF and credentials are absent. Production project remains ACTIVE_HEALTHY but unchanged; current production RLS/privacy and profile-save errors are recorded in the companion audit. No production migration, Edge Function deployment, or Auth/payment configuration was changed.


## Account deletion — production and staging catalog follow-up (27 Nov 2026)

Read-only catalog audits of both production and isolated staging confirm the audit-reference cleanup migration is applied. Important correction: PostgreSQL `confdeltype='n'` means **ON DELETE SET NULL**, not NO ACTION. The three reviewed audit references (`campagnes.cree_par`, `demandes_support.traite_par`, `signalements.traite_par`) are nullable and use SET NULL; they do not block Auth-user deletion. The trusted migration source is present as `supabase/migrations/20261124120000_account_deletion_fk_cleanup.sql`; production records the deployed version as `20261124122733 account_deletion_fk_cleanup` (deployment-time version alias). The dedicated account-deletion FK fixture/check passed in the prior CI run.

Account deletion is nevertheless **not complete**: there is no server-authenticated self-service deletion workflow and several user-linked UUID columns have no direct FK, including `messages.de/a`, `paiements.user_id/cible`, `rendez_vous.de/a`, `signalements.de`, `avis_match.user_id/autre`, `avis_site.user_id`, `deblocages.user_id/cible`, and `ai_manager_audit.admin_id`. Each needs an explicit delete/anonymize policy. `admin_actions.cible` is also missing the FK in production; the candidate admin-audit migration adds `ON DELETE SET NULL` after the read-only production orphan count returned zero. Payment/receipt retention must be decided before deleting or anonymizing payment records, and private Storage objects must be removed.

No deletion test account or production data was changed during these catalog audits. Before launch, implement a server-authenticated account-deletion workflow, define payment/receipt retention versus erasure, delete private Storage objects, then test it end-to-end on an isolated restore. Do not advertise complete account deletion until the Auth user, linked rows, Storage objects, sessions, and residual references are verified absent or intentionally anonymized.


## Recovered message media guard source — 27 Nov 2026

Production `pg_get_functiondef('public.limite_messages()')` was read-only inspected and confirms the live guard accepts `image`, `audio`, `video`, and `document` attachments only when `media_url` matches the authenticated sender/recipient folder path; it retains `call` room validation, sender identity, block/suspension checks, and the free-chat quota. The current tracked historical migration `20261119180000_allow_video_chat_media.sql` does not include the `document` branch, so a clean replay from tracked sources would regress document sending.

Added `supabase/migrations/20261126240000_reconcile_message_media_types_from_live.sql`, recovered from the live function definition, plus an isolated fixture/check that validates document acceptance, valid image/call acceptance, forged document-path rejection, and unknown media-type rejection. The validation workflow now includes a dedicated PostgreSQL job for this reconciliation. This is a candidate-only source repair; production was not modified.

Remaining exact-name ledger mismatches are still 20. Several are aliases/consolidated migrations; the candidate does not claim these are pending. The historical username-login, call URL/media, scheduled AI alerts/review, instant push dispatch and initial admin-audit/private-media SQL source still need trusted recovery or a reviewed live-schema baseline before a full fresh-project replay can be certified.

## Recovered admin payment push dispatch source — 27 Nov 2026

Production catalog recovery confirmed the exact dispatch structure: service-role-only `admin_push_queue` (payment FK cascade, pending partial index) and `admin_push_subscriptions` (admin-user FK cascade, unique endpoint, active-device index), both RLS-enabled with no browser policies; a `paiements` AFTER INSERT trigger; the private `notify_admin_new_payment_push()` function; service-role-only `get_malachite_push_secrets()`; and the named one-minute `malachite-admin-payment-push-batch` cron job. The function definitions were read from production without selecting Vault secret values.

Added `20261126250000_reconcile_admin_payment_push_dispatch.sql` to reconstruct the live schema/function/trigger/cron from catalog evidence, plus an isolated fixture/check for least privilege, idempotent scheduling, Vault hook creation, signed immediate dispatch and no queueing without an active admin subscription. Added `docs/ADMIN_PAYMENT_PUSH_SETUP.md` for VAPID key setup. VAPID public/private keys are deliberately external Vault configuration and are not in source.

The exact historical SQL filenames for the two original instant-push ledger entries remain absent; the new migration restores the verified final live behavior for clean replay. Production was not modified.

## Recovered AI alert and human-review queue source — 27 Nov 2026

Production catalogs were read for `malachite_ai_alerts` and `malachite_ai_review_queue`: both are RLS-enabled, have no browser policies, and are granted only to `service_role`; constraints, identity columns, unique keys and the review-status index were captured. Added `20261126260000_reconcile_ai_alerts_and_review_queue_from_live.sql` with the verified final alerts/review schema plus the singleton AI settings table. Fresh replay defaults scheduled briefings OFF to avoid unapproved API spend; an existing owner setting is preserved by `ON CONFLICT DO NOTHING`. The isolated fixture/check covers least privilege, service writes, uniqueness, state updates, cost-safe default and idempotent replay.

The original ledger filenames for alerts and review queue remain historical aliases; their final live state is now represented in a tracked candidate migration. The AI worker cron/run foundation remains represented by `20261120220000_ai_autonomous_operations_foundation.sql`. Production was not modified.

## Recovered administrator allowlist and audit source — 27 Nov 2026

Production catalog recovery confirmed `private.admins(user_id)` is a private RLS-enabled allowlist with Auth-user cascade, and `private.is_admin()` is a SECURITY DEFINER lookup against `auth.uid()` (authenticated execute only). `public.admin_actions` is RLS-enabled with an admin-only SELECT policy, service-role write access, an audit-admin FK that SET NULLs on Auth deletion, and the two verified indexes. The candidate also adds a target-user FK with SET NULL; production has zero existing orphan targets, and that FK remains unapplied until the backup/restore gate. No administrator UUID was copied into source.

Added `20261126270000_reconcile_admin_audit_and_allowlist_from_live.sql`, isolated least-privilege/admin-vs-member/audit-retention checks, and `docs/ADMIN_ACCESS_SETUP.md` for a safe one-time allowlist seed. The candidate also adds `ON DELETE SET NULL` for `admin_actions.cible` and `ai_manager_audit.admin_id`; it nulls pre-existing orphan AI audit IDs while preserving audit rows. Production has zero existing `admin_actions.cible` and `ai_manager_audit.admin_id` orphans at this read-only snapshot. The original `202611180003_admin_audit_private_media` migration remains unrecovered as a whole; the admin allowlist/audit portion is now represented from verified live catalog definitions, while the later tracked private-media migrations represent the media side.

## Admin policy migration-order prerequisite — 27 Nov 2026

Fresh-replay review found that tracked `202611180002_moderation_and_blocking.sql` creates RLS policies calling `private.is_admin()`, while its current source did not define that function or the allowlist table beforehand. Added `20261118000150_admin_allowlist_prerequisite.sql` (14-digit version ordered between 0001 and 0002) to create the private allowlist and authenticated-only admin-check function before those policies. It intentionally seeds no administrator. The isolated prerequisite fixture verifies admin/non-admin results and browser denial to the allowlist. The later `20261126270000` reconciliation remains idempotent and adds the audit tables/cleanup.

This is a source-chain repair for clean replay; it is not applied to production. Production admin identity remains unchanged.

## Migration inventory after source recovery — 27 Nov 2026

Latest candidate inventory: **97 SQL migration files** (78 current-main files + 19 candidate-only files), 65 production ledger rows, 45 exact normalized ledger-name matches and 20 historical name mismatches. The 20 are not a pending apply list. Six new candidate migrations recover final live behavior: admin prerequisite ordering, username mapping/throttle storage, message media guard, admin payment push, AI settings/alerts/review queue, and admin allowlist/audit cleanup. The exact historical migration filenames remain absent, but final source/fixtures now cover those live effects except the original combined media/audit migration's historical provenance.

Candidate now has six new isolated PostgreSQL validation jobs for those recovered objects. All six passed in the latest CI run. The current candidate head `a5f48df4c174f66188e40a43b35ce1651eb2f140` has 23/23 Malachite validation jobs plus Match runtime, release integration contract and live Pages verification passed (26/26 checks total). The payment-push recovery test now verifies a project-specific Vault URL and confirms that a missing URL produces no outbound HTTP request. These checks are isolated CI evidence, not a production-equivalent restore/replay. No production migration was applied.

## Recheck — 27 Nov 2026, 06:25 UTC

This section supersedes older branch-head and staging-ledger counts above where they differ.

- PR #158 current head at recheck: `7e515f2390338ed102b139d3d6ac92a3cf041e4b`; PR remains open and draft.
- All four workflows completed successfully on this exact head: Malachite validation, Match isolated PostgreSQL runtime, release integration contract, and live Pages verification.
- Candidate migration directory: 97 SQL files. Current `main`: 78 SQL files. The candidate contains 23 filenames not present on main and four renamed historical files; net inventory difference is 19. These are source inventory facts, not a migration execution plan.
- Production migration ledger: 65 rows; latest recorded deployment version remains `20261124122733 account_deletion_fk_cleanup`.
- Staging migration ledger: 73 rows, 68 distinct logical names; latest deployment version `20261126202219 add_fk_supporting_indexes`. Staging also contains schema-only baseline/snapshot entries and repeated logical names. Exact filename-to-ledger matching therefore cannot be used to classify all candidate migrations as pending or applied.
- A new read-only production catalog check reconfirmed authenticated CRUD grants on `profiles`, `paiements`, `call_sessions`, `config`, `statuts` and `campagnes`; `config` and `statuts` still have permissive SELECT policies, and profile/photo read policies still do not enforce the complete private-profile rule.
- Production `save_my_profile(jsonb,jsonb)` remains SECURITY INVOKER and only rejects a non-null age below 18; missing and over-100 ages are not rejected. Production `start_call_session` remains executable by authenticated users and still creates sessions for the legacy call implementation. The candidate deliberately disables calls until authenticated JaaS is configured and verified.
- The current production security advisor still reports leaked-password protection disabled, one anonymous SECURITY DEFINER preview function, and nine authenticated SECURITY DEFINER functions. Several of the authenticated functions contain explicit admin checks or are narrow wrappers around private functions; the advisor warnings require individual authorization review and are not by themselves proof of an exploit.
- The live referrer preview function only excludes private profiles; the candidate adds suspension and mutual block checks. Production has not received that change.
- The connected Supabase tools expose no Auth setting control for leaked-password protection. No Auth setting, production database object, production Edge Function, payment destination, or production deployment was changed during this recheck.
- Backup export, off-site storage, and isolated restore remain unverified. JaaS tenant/API credentials and two-account private-call tests remain unavailable. No production-equivalent full migration replay has been completed.

Conclusion: this head is CI-verified and the Pages smoke workflow passes, but PR #158 is not production-deployable or launch-certified. Keep it draft until backup/restore, migration replay, Auth password protection, profile/privacy/ACL cutover, account deletion, payment push configuration, and authenticated private-call tests are completed.

## Payment-push live dispatch check — 27 Nov 2026, 06:27 UTC

Read-only production checks confirmed the current payment-push infrastructure is active:
- The malachite-admin-payment-push-batch cron job runs every minute.
- The payment insert trigger is enabled.
- Vault contains the VAPID public key, VAPID private key and internal push-hook secret; secret values were not read.
- One active admin device subscription exists; the push queue currently has zero pending rows.
- The production malachite-admin-push Edge Function returned HTTP 200 for all 1,383 requests observed in the last 24 hours (zero non-200 responses). These requests are the scheduled queue-drain calls; they do not prove that a real notification was delivered to the device.

Important migration-order/configuration prerequisite: production's current trigger and cron use the production endpoint directly. Candidate migration 20261126250000_reconcile_admin_payment_push_dispatch.sql deliberately switches to Vault secret malachite_push_project_url; that secret is currently absent in production. Before applying the candidate migration to any environment, set this secret to that same environment's Supabase base URL, then verify the Admin test notification on the registered device. Do not submit a real production payment just to test push delivery. No payment, queue row, subscription, Vault secret, cron job or production function was changed during this check.


## Deep stabilization pass — 27 Nov 2026, 06:50 UTC

### Staging execution and regression checks
The following candidate migrations were executed against staging only: username-login schema reconciliation, atomic login throttle, message suspension policy, founder-finance RPC restriction, retired-campaign ACL revocation, message-media guard reconciliation, admin payment-push reconciliation, AI alert/review queue reconciliation, admin audit/allowlist reconciliation, login-attempt retention cleanup, and reduced idle payment-push dispatch. The corrected payment-push reconciliation migration was replayed once on staging to verify its complete SQL body.

Transaction-scoped checks passed for:
- Username mapping: case-insensitive uniqueness, browser-role denial, service-role read path, atomic per-IP throttle, and retention cleanup.
- Effective authenticated table ACLs and call RPC grants.
- Private profile and profile-photo visibility, including owner access and preservation of private profile data.
- Supported chat media types and rejection of forged media paths.
- Call-session transitions through the guarded RPC: direct mutation denied, acceptance blocked while provider is disabled, caller end and callee rejection permitted.
- AI alert/review queue service-role access and human-review state changes.
- Admin audit/allowlist deletion behavior and founder-finance RPC ACL.
- Payment push: a temporary transaction-scoped staging URL, fake subscription and payment created the expected pending queue row and signed request to the staging endpoint. The transaction was rolled back; no external push was sent.

After rollback, staging contained zero test Auth users, profiles, payments, push queue rows, push subscriptions, or temporary project-URL Vault secret. The staging cron now runs the payment-push recovery worker every five minutes and skips HTTP dispatch unless both a pending queue row and an active subscription exist. The direct payment-insert trigger remains immediate.

### New maintenance and performance adjustments
- Added a daily 03:17 UTC cleanup for hashed username-login attempts older than 24 hours, with a dedicated timestamp index. This matches the maximum one-hour throttle window and prevents unbounded growth.
- Reduced idle payment-push polling from once per minute to every five minutes, with pending-queue and active-device guards. This is a candidate change only; production remains unchanged until a controlled deployment.
- Production pg_stat_statements showed only four old login-attempt rows at the time of inspection. No indexes were removed based on "unused index" notices because the live dataset is very small (five profiles), so those notices are not reliable evidence of harmful indexes.

### Production runtime observations (read-only)
- All 1,440 admin-payment-push cron runs, 96 AI-worker cron runs, and 288 entitlement-expiry cron runs recorded as succeeded in the preceding 24 hours; no failed cron runs.
- The deployed admin-push Edge Function logged 1,381 HTTP 200 requests and the AI worker 91 HTTP 200 requests in the inspected 24-hour window. These status codes confirm function responses, not actual notification delivery to the registered phone.
- The retained pg_net response window contained 384 attempts: 368 successful responses and 16 DNS-resolution timeouts (no HTTP response). The logs do not identify which endpoint each DNS timeout belonged to. The queue fallback can retry pending payment notifications.
- Production pg_net is installed in the `extensions` schema. Staging had pg_net first installed in `public` before the migration was corrected to request `extensions` on fresh replay; pg_net is non-relocatable, so the staging warning remains isolated to that test project.

### Remaining launch blockers
- Production still has broad authenticated table grants, incomplete private-profile/photo enforcement, and the old `save_my_profile` RPC behavior until the candidate security cutover is deployed.
- Production Auth leaked-password protection is disabled; the connected Supabase tools expose no control to enable this Auth setting.
- Backup export, off-site retention and isolated restore have not been evidenced.
- Authenticated private JaaS tenant credentials and two-account call tests are still unavailable; calls and call-pass sales remain deliberately fail-closed.
- The candidate push migration expects Vault secret `malachite_push_project_url`; production's current push implementation still uses its existing configured path. Verify environment-specific URL and test notification before cutover.
- Account deletion, full migration replay, and production payment-push delivery on the registered phone remain unverified.

### Staging-only advisor note
Staging's `private.call_provider_config` table has RLS disabled, but direct SELECT is not granted to `anon` or `authenticated`; only `service_role` has table access. The Supabase advisor still flags the disabled RLS setting. No policy or RLS change was applied automatically. The existing private schema access pattern and service-role dependency must be reviewed before deciding whether to enable RLS and define policies.

No production database object, Auth setting, Edge Function, Vault secret, cron job, payment destination, or deployed site content was changed in this pass. PR #158 remains a draft pending fresh CI and external launch gates.


## Recheck — 27 Nov 2026, 09:08 UTC

- Candidate PR #158 head: `a6c6495ff44a1a06aae5e249a943838fd427cf25`. All four workflows passed on this exact head: validation, isolated Match PostgreSQL runtime, release integration contract, and live Pages verification. PR remains open and draft.
- Staging received the login-attempt retention and idle payment-push dispatch migrations, plus the new `optimize_auth_fk_cleanup_indexes` migration. A transaction-scoped assertion confirmed the per-IP login throttle, service-only RPC access, finance RPC restriction, and private push-table grants. Call-provider state remains disabled; authenticated clients cannot create call sessions or directly mutate them. The participant status RPC remains available for limited reject/end flows.
- The performance advisor no longer reports unindexed foreign keys in staging after adding indexes for `admin_actions.cible`, `conversation_pair_index.member_high`, and `messages.sender_id`. It still reports unused-index notices; these are not grounds for deletion while the staging dataset is empty.
- Production health advisor returned no findings. Production security advisor still reports leaked-password protection disabled, one anonymous SECURITY DEFINER referral-preview RPC, and nine authenticated SECURITY DEFINER RPCs. The referral preview's live production definition still checks only the private-profile flag; the candidate version adds suspension and mutual-block exclusions. The other authenticated warnings were individually inspected: the admin referral and founder overview RPCs perform explicit admin checks; Match wrappers delegate to private user-scoped functions; the legacy call-creation RPC remains the actionable gap until the fail-closed migration is deployed.
- Production currently has 10 Auth users. Account-deletion readiness is not complete: the live schema still has user-related references without foreign keys, including `avis_match.user_id`, `avis_site.user_id`, `deblocages.user_id/cible`, `messages.de/a`, `paiements.user_id/cible`, `rendez_vous.de/a`, and `signalements.de`. These references require explicit retention/anonymization decisions before a deletion endpoint can safely remove Auth users. The existing account-deletion preparation only covers selected audit actor references; it is not a complete self-service deletion implementation.
- Production has not received the candidate migrations or index additions. No production data, Auth configuration, payment destination, Vault secret, Edge Function, cron job, or site deployment was changed. Backup/restore proof, Auth leaked-password protection, full deletion policy, private JaaS setup/two-account tests, environment-specific push URL and real device delivery remain launch gates.


### Username-login Edge Function production comparison — 27 Nov 2026, 09:12 UTC

A direct source comparison found a live production gap not covered by SQL migration alone:
- Production `username-login` is still deployed at version 7. Its login throttle performs a separate count-then-insert (raceable under concurrent attempts) and falls back to caller-controlled `x-real-ip` / `x-forwarded-for` when Cloudflare's edge IP header is absent. Its username-availability `action=check` path is not rate-limited.
- Candidate repository source now uses the atomic service-role-only `consume_username_login_attempt` RPC, trusts only `cf-connecting-ip`, applies a separate throttle to the availability-check path, and fails closed when the trusted edge IP is unavailable.
- The staging project currently has no deployed `username-login` Edge Function, so the new function's end-to-end HTTP behavior has not been exercised there. SQL-level throttle/ACL checks and the GitHub validation workflow pass, but the candidate Edge Function must be deployed and tested in a disposable/staging environment before production rollout.
- Production's active `username-login` function was not replaced. This remains a launch security gate alongside backup/restore and the Auth password-protection setting.


## Runtime verification — username login and final CI pass, 27 Nov 2026, 09:20 UTC

- Candidate PR #158 head `b45fe878b86b5994b54b66e719d71d42ab524d57`: all four workflows passed on this exact commit. Malachite validation completed **24/24 jobs**, including type-checking every Edge Function and the deployed staging username-login runtime probe; Match isolated PostgreSQL runtime, release integration contract and live Pages verification also passed.
- The staging `username-login` Edge Function is deployed at version 1. A public-path HTTP test from GitHub Actions successfully exercised both `action=check` (boolean availability response) and the login negative path (generic HTTP 400 for invalid credentials). This confirms the deployed function receives the trusted edge IP header and can call the service-only atomic throttle on the tested public route. The earlier Postgres-originated HTTP probe returned 403 at the gateway and did not reach the function; it is not counted as a function failure.
- The three FK-supporting indexes were applied to staging and the performance advisor no longer reports unindexed foreign keys there. No unused indexes were removed.
- Production remains on `username-login` Edge Function version 7 and still uses the old non-atomic count-then-insert throttle with caller-controlled forwarding-header fallback. The tested candidate version has not been deployed to production.
- PR #158 remains open and draft. No production database, Auth configuration, Edge Function, Vault secret, payment destination, cron job, or site deployment was changed.


## Recheck — 27 Nov 2026, 09:20 UTC

- Latest PR #158 head at this check: `52e99b5bf7a63c34a2bba76ed377d1d67bb9ec15`; all four workflow runs passed on this exact head. The Malachite validation workflow contains 24 separate jobs and all 24 completed successfully, including chat media, private profile/photo access, account-deletion FK fixture, payment-push reconciliation, call access/suspension/expiry, founder-finance ACL, authenticated ACL, entitlement visibility/expiry/pricing, username login throttle/runtime, profile age enforcement, admin allowlist/audit, and AI alert/review reconciliation.
- Staging security advisor still reports 13 RLS-enabled tables without policies. Direct privilege checks confirm anon/authenticated have no SELECT/INSERT on the listed admin, AI, config, username, referral, and private tables; service_role has the intended access on public service tables. These advisor items are not public data exposure under the checked grants. The staging-only `pg_net` extension remains in `public` because the first replay installed it there; the corrected candidate migration requests `extensions` on fresh replay. Production has pg_net in `extensions`.
- Production has 10 Auth users and 13 user-reference columns without corresponding foreign keys. Current rows in those columns are not orphaned against `auth.users`: admin actions 6, AI audit 22, match reviews 11, site reviews 4, messages 70 sender + 70 recipient, payments 8, appointments 1, reports 2; block rows currently 0. Payment target references are all NULL. These counts are a point-in-time inventory, not a deletion policy.
- Account deletion must not be implemented by blindly adding CASCADE: message history, payment evidence, reports, reviews, and audit records have different retention/anonymization requirements. A safe endpoint needs an explicit product retention policy, a transactional anonymization/deletion plan, storage cleanup, session revocation, and tests with representative rows. No production data was changed.
- Production health advisor remains clean. Production security gaps and external gates remain as previously recorded: Auth leaked-password protection disabled, overly broad authenticated table grants, incomplete private profile/photo enforcement, legacy call creation until fail-closed cutover, backup/restore evidence absent, private JaaS credentials/two-account tests absent, payment push project URL/device delivery unverified, and account deletion policy incomplete.
- PR #158 remains open/draft. No production deployment, migration, Auth setting, secret, payment destination, or data mutation was performed.


## Recheck — 27 Nov 2026, 09:35 UTC

- Added `supabase/tests/security_definer_surface_allowlist_checks.sql` to the candidate branch and executed it against staging successfully. It asserts that the only anonymous SECURITY DEFINER RPC is the intentional referral preview; every authenticated SECURITY DEFINER RPC is on an explicit reviewed allowlist; all expected user-facing RPC signatures remain present; and every exposed SECURITY DEFINER RPC has a fixed search_path.
- The allowlist check passed against the current staging schema. The exposed RPCs were inspected: admin/payment/moderation/announcement functions enforce the admin allowlist; profile/avatar/preferences/notification functions bind writes to `auth.uid()`; Match and block helpers derive results from the caller and filter private/suspended/blocked profiles; contact lookup requires a mutual match and Premium or an explicit unlock. The referral preview is intentionally public for referral onboarding and filters private, suspended, and mutually blocked profiles in the candidate.
- Supabase security advisor's remaining RLS-without-policy notices are service-only tables. Direct ACL checks show no anon/authenticated table read/write grants on those tables; service_role is the intended access path. Do not add permissive RLS policies merely to silence informational lints.
- Staging has `pg_net 0.20.4` in `public` because it was installed by an earlier staging replay. That extension version is marked non-relocatable. Production has `pg_net` in `extensions` and `pg_cron` in `pg_catalog`. Do not attempt to move the staging extension with `ALTER EXTENSION SET SCHEMA` or drop/recreate it as part of this pass; that could disrupt dependencies. A clean replay uses the candidate migration's schema-qualified extension creation.
- Production security advisor still reports 1 anonymous and 9 authenticated SECURITY DEFINER RPCs, but several are intentionally user-scoped wrappers. The actionable production gaps remain the un-deployed referral-preview hardening, legacy call-session creation, broad direct table grants, and disabled leaked-password protection. Production health advisor remains clean.
- The allowlist test was run directly against staging, not yet added to the 24-job GitHub validation workflow. The existing 4 CI workflows and 24 validation jobs passed on the preceding head; the newest head is being revalidated.
- No production migration, deployment, Auth setting, secret, or data mutation was performed.


## Recheck — 27 Nov 2026, 09:50 UTC

- A targeted production log review found 28 HTTP 400 requests for one stored 3D avatar signed URL on 26 Nov. Its token was issued on 20 Nov with a one-hour expiry; the underlying Storage object still exists. Production has exactly one profile with a persisted signed avatar URL, and its durable `imagePath` is present. This is a stale bearer URL, not a missing image file.
- Candidate frontend now discards persisted `/storage/v1/object/sign/` URLs as soon as profile rows are loaded. The existing resolver then requests a fresh signed URL from the durable `imagePath`; profiles without a recoverable path fall back instead of repeatedly requesting an expired URL. The PWA cache is bumped to `malachite-static-v110` so the corrected client is not hidden behind an old cached script.
- Added migration `20261127080300_strip_persisted_signed_avatar_urls.sql` to remove only transient signed `imageUrl` values from stored avatar JSON while preserving `imagePath` and avatar configuration. It applied successfully on staging, where no legacy signed avatar URLs remained. A dedicated fixture/test and CI job verify cleanup and preservation.
- A production permission check confirmed the source of the 11 profile-save 403s: `public.save_my_profile` is still SECURITY INVOKER in production while authenticated clients have no direct INSERT/UPDATE on `profiles` and `prives`. The candidate cutover changes the RPC to SECURITY DEFINER with explicit `auth.uid()` ownership checks; the isolated profile-write/age tests already pass on staging. Production remains unchanged.
- Production's only SECURITY DEFINER function whose search path is not empty or `pg_catalog` is `public.est_premium(uuid)`, currently `search_path=public`. It is not executable by anon/authenticated, but candidate migration `20261127080400_harden_est_premium_search_path.sql` pins an empty search path and fully qualifies `public.statuts`; staging test passed.
- Removed two duplicate migration invocations from CI (AI review queue and admin audit replay), and added dedicated test coverage for the premium helper search path and persisted avatar URL cleanup.
- Current candidate head after these changes: `ce7536576e45ce03b35588d85a4da13fd8bc32e1`. Four workflows were queued at the time of this note; no new pass is claimed until they complete.
- No production migration, data update, Auth setting, Storage object, secret, payment destination, Edge Function, cron job, or Pages deployment was changed.


## Recheck — 27 Nov 2026, 10:05 UTC

- Reviewed the current client source against effective staging table/column privileges. Found that the app's live flows require narrow updates to message read receipts, notification read state, appointment status, moderation status, and Match votes. Broad table-level UPDATE/DELETE grants were not needed.
- Added candidate migrations `20261127080100`, `20261127080200`, and `20261127080500`:
  - Messages are append-only for authenticated clients: SELECT/INSERT retained; UPDATE/DELETE revoked.
  - Site reviews are insert/read only; Match votes can update only `autre, ok`; appointments can update only `statut`; reports can update only `statut, traite_par, traite_le`; message receipts and user notifications can update only `read_at`.
  - Direct notification INSERT/DELETE and unused DELETE grants on reviews, appointments, and reports are revoked. Existing RLS policies remain in force.
- Applied the migrations to staging and verified the exact column-level grants. The app-required read/submit/status flows retain their needed columns; message table-level UPDATE/DELETE are false. The staging ACL assertion passed.
- Production still has broad message UPDATE/DELETE and has not received these candidate changes. No production migration was applied.
- Organization plan was confirmed as Free. Supabase's current docs state daily backups are automatic on Pro/Team/Enterprise, not Free; leaked-password protection is Pro and above. The new `docs/PRODUCTION_BACKUP_RESTORE_RUNBOOK.md` records the production footprint (24 MB database; six private buckets, 66 objects, about 67.1 MiB) and the exact gap: CLI logical dumps alone exclude managed Auth/Storage schemas and object bytes, so they are not a full restore.
- No plan upgrade, billing change, Auth setting, Storage S3 configuration, secret, or production data was changed. The full isolated backup/restore gate remains open.


## Recheck — 27 Nov 2026, 10:00 UTC

- Expanded the SECURITY DEFINER allowlist test to inspect every SECURITY DEFINER function in both `public` and `private`, not only exposed RPCs. It now rejects missing or unsafe search paths; only an empty search path or `pg_catalog` is accepted. The complete allowlist test passed again against staging.
- Candidate validation now contains 26 isolated jobs, including dedicated fixtures for expired-avatar URL cleanup and `est_premium` search-path hardening. The latest head is `1f465415212d03e4a952c5a6b5610ea65e2141a4`; four GitHub workflows have been queued and must finish before any pass is claimed.


## Recheck — 27 Nov 2026, 10:20 UTC

- Extended the source-to-ACL audit to all remaining direct client write paths in the shipped UI.
- Added migrations `20261127070000` and `20261127080000`:
  - Legacy `conversation_members`, `conversation_pair_index`, and `conversation_threads` are not referenced by the current browser client or database functions; authenticated INSERT/UPDATE/DELETE grants are revoked while SELECT is retained for compatibility.
  - Support tickets remain member-insertable and admin-readable; authenticated DELETE is revoked. Admin updates are column-scoped to `statut`, `reponse_admin`, `traite_par`, and `traite_le`, with the existing admin-only RLS policy retained.
- The support UI and AI manager were inspected: browser admin updates only those four columns; AI worker/manager use the service-role client and are unaffected by authenticated column grants.
- Applied the support update grant migration to staging; the combined client mutation ACL assertion passed. The previous message append-only and legacy conversation assertions also passed on staging.
- Candidate migrations now preserve the precise writes used by the browser while removing unused table-wide mutations. Production retains its old grants until an approved, backed-up release is performed.
- Latest CI workflow rerun is pending on the newest branch head; do not call this head CI-green until all four workflows complete.


## Recheck — 27 Nov 2026, 10:15 UTC

- Found and corrected duplicate Supabase migration version prefixes. All 107 candidate migration files now have unique 12–14 digit versions; a new scripts/validate.mjs guard fails the build if any future duplicate or invalid prefix is introduced. CI references were updated to the unique versions.
- Reviewed the least-privilege client ACL changes against every current frontend table write. Messages are append-only; match votes retain only required upsert columns; appointment replies retain only statut; reports retain only moderation fields; notification reads retain only read_at; support requests retain member submission and only the four admin resolution columns. No shipped UI operation uses the revoked writes.
- Added a dedicated support-admin column-grant test and corrected the CI sequence so column-scoped mutation assertions run only after required grants have been restored.
- Executed five staging checks successfully: unused client mutation ACLs, message append-only ACLs, legacy conversation write revocations, support admin column grants, and the full SECURITY DEFINER allowlist/search-path audit.
- The staging migration ledger now has 99 entries and production remains at 65. Staging includes a schema-only baseline and renamed/replayed historical migration names, so comparing file suffixes directly still produces false pending/extra lists. This remains an explicit reconciliation gate; no full migration replay or production deployment was attempted.
- No production migration, data update, Auth setting, Storage object, secret, payment destination, Edge Function, cron job, or Pages deployment was changed.


## Recheck — 27 Nov 2026, 10:35 UTC

- Added candidate migration `20261127080300_strip_persisted_signed_avatar_urls.sql`. Production read-only inventory found exactly one persisted signed Storage URL in a 3D avatar record. Its durable `imagePath` is present and the referenced object exists in the private `profile-photos` bucket. No signed URLs were found in `profiles.photos`, `messages.media_url`, payment receipt paths, or notification bodies. The migration removes only the transient `avatar.imageUrl` key and preserves the durable path; the client regenerates a fresh signed URL from that path when loading the profile.
- Added candidate migration `20261127080400_harden_est_premium_search_path.sql`. It fixes `public.est_premium(uuid)` to use an empty search_path and a fully qualified `public.statuts` relation. The function remains non-executable by anon/authenticated. The staging assertion passed.
- Rechecked every SECURITY DEFINER function in the staging `public` and `private` schemas: all have a fixed search_path; the only non-empty path is the RLS auto-enable helper fixed to `pg_catalog`. No unfixed path was found.
- Replayed the renumbered ACL/avatar/search-path migrations on staging. The staging migration ledger contains multiple generated timestamps for some repeated logical migration names because the staging apply tool records each replay independently. The SQL effects are idempotent; do not try to delete or rewrite ledger rows manually. Production migration reconciliation remains a separate, backed-up release gate.
- The production avatar cleanup migration has not been applied. The single avatar object remains present; no production profile or Storage object was modified.


## Recheck — 27 Nov 2026, 10:25 UTC

- Found a migration-order dependency in the least-privilege ACL work: PostgreSQL table-level REVOKE removes the relevant column-level UPDATE grants as well. The restore-grants migration was therefore moved to version `20261127080500`, after the table-wide revocations at versions `20261127080100` and `20261127080200`. CI now follows the same chronological order.
- Verified this exact order in a staging transaction: revoke table UPDATE on match votes, appointments, reports, receipts and notifications; apply the final column-grant migration; run the client ACL assertions; rollback. All assertions passed. No staging data was changed.
- Current candidate migration inventory remains 107 files with unique versions. The validation script now enforces unique 12–14 digit prefixes.


## Recheck — 27 Nov 2026, 10:50 UTC

- A complete browser-source write scan found one additional required direct update: online presence writes only `profiles.derniere_vue`. The profile RLS UPDATE policy already restricts the row to `id = auth.uid()`; the broad UPDATE privilege had been revoked by the ACL hardening.
- Added `20261127080600_restore_profile_presence_update_grant.sql`, granting authenticated users UPDATE on `derniere_vue` only. The ACL test now asserts that table-wide profile UPDATE and UPDATE on `bio` remain denied while the presence column is writable. Applied on staging; the assertion passed.
- The remaining browser writes were mapped to their least-privilege grants: messages INSERT only; message receipts `read_at`; Match votes `autre, ok`; appointments `statut`; reports `statut,traite_par,traite_le`; support tickets `statut,reponse_admin,traite_par,traite_le`; notifications `read_at`; blocks INSERT/DELETE. Payment submission remains intentionally paused and its receipt upload policy is absent in staging.
- Production data integrity recheck: all 4 profile photo references point to existing Storage objects; all 30 image/audio/video/document message media references point to existing `chat-media` objects; all payment receipt references resolve. Two legacy call messages contain public Jitsi room URLs but the current UI renders them as unavailable text, not clickable links; no matching call-session rows exist. No message rows or objects were changed.
- The candidate CI workflow is queued on the latest branch head; do not claim its latest commit is CI-green until all four workflows finish.


## Recheck — 27 Nov 2026, 10:45 UTC

- Reviewed the live-presence heartbeat in app-core.js. The client directly updates only profiles.derniere_vue; all profile, avatar and preference edits use validated SECURITY DEFINER RPCs. Added a final ACL migration that revokes all direct profile privileges, restores authenticated SELECT, and grants UPDATE only on derniere_vue.
- The staging migration applied successfully. Staging assertions confirm table-wide INSERT/UPDATE/DELETE are absent, only derniere_vue has UPDATE, and the existing UPDATE RLS policy remains owner-scoped.
- Added an isolated PostgreSQL fixture/test for successful owner heartbeat updates, rejected direct bio updates, and rejected cross-user heartbeat updates. The test is wired into the effective ACL CI job after the migration.
- Candidate migration inventory now contains 108 SQL files with unique versions; the CI validator enforces this.


## Live ledger reconciliation update — 27 Nov 2026, 13:05 UTC

Fresh read-only catalog snapshot:
- Production ledger: 65 rows, latest `20261124122733 account_deletion_fk_cleanup` (unchanged).
- Staging ledger: 106 rows, latest version `20261127082520`, name `restrict_profile_writes_to_presence_only`; 90 distinct logical migration names because idempotent/reconciliation migrations have been re-applied under generated versions.
- Candidate branch: 109 migration SQL files, all 109 version prefixes unique (validation guard enforces this).
- Staging records the candidate's security migration effects under generated timestamp versions, so matching filename prefixes to staging ledger versions is invalid. The latest candidate ACL migrations are represented in staging by their logical migration names; read-only effective-privilege checks confirm profile presence-only direct UPDATE, no direct call-session writes, no payment UPDATE/DELETE, and the final private-profile SELECT policy.
- No production migration was applied. The production baseline remains unreconciled against a disposable production-derived restore; this update does not create a pending-migration count.

Before production deployment, prepare a single forward-only release package against the actual production schema, record each exact migration's effect and dependencies, test the complete ordered package on a production-derived disposable database, and compare the post-migration catalog to the expected final ACL/policy/function state. Do not replay staging's 106-row ledger or use timestamp subtraction to infer pending files.


## Fresh migration ledger comparison — 28 November 2026, 12:58 UTC

Read-only `list_migrations` snapshot:

- Production `tscsmemsvgacqioncash`: **65 ledger rows**, latest `20261124122733 account_deletion_fk_cleanup`.
- Staging `sbawknyxcjslvhknomkd`: **126 ledger rows**, latest `20261127225838 harden_public_referrer_preview`.
- The ledgers are not directly replay-compatible: staging includes a schema-only baseline/snapshot series and candidate migrations with versions that do not exist in production's applied ledger. A raw staging-minus-production list would incorrectly classify baseline and test migrations as deployable production changes.
- Production's migration ledger has not advanced during this read-only check. No migration was applied and no schema/data mutation was made.

**Next safe step:** produce a production-equivalent isolated restore from verified DB/Auth/Storage backup, then reconcile each candidate migration by schema effect and final ACL/policy state. Do not merge staging's 126 ledger rows into production or bulk-apply the 61-row count difference.
