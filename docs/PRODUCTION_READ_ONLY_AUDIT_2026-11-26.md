# Production read-only audit — 26 November 2026

Project: `tscsmemsvgacqioncash` (eu-west-1, PostgreSQL 17.12, ACTIVE_HEALTHY)
Repository: `famousnadroj-sys/malachite`
Scope: read-only inspection only. No production DDL, data writes, deployments, or configuration changes were performed for this audit.

## Migration drift

- Production records 65 applied migrations.
- Latest production migration: `20261124122733 account_deletion_fk_cleanup`.
- The security/call hardening migration in PR #158 is not applied to production.
- The repository contains 78 migration SQL files. The production history records 65 applied migrations. File timestamps, recorded Supabase version IDs, and logical migration names do not map one-to-one (some files are renamed/aliased), so the exact pending set is **not certified** by a simple timestamp or file-count subtraction. Reconcile each candidate by recorded name and live schema effect against an isolated production-equivalent database; never apply all later-timestamp files blindly.
- Supabase currently exposes only the default/main branch. Creating a separate development branch is billable at the quoted rate of USD 0.01344/hour. No paid branch was created.

## Call-session security — confirmed production gap

Production `public.start_call_session(uuid,uuid,text,text,timestamptz)` is SECURITY DEFINER and executable by authenticated users. Its current definition validates:
- authenticated caller, callee and mode;
- room string length and expiry window;
- callee profile existence;
- Premium/paid-call entitlement;
- block status through `private.is_blocked_with`;
- mutual match and active-call conflicts.

It does **not** check a configured authenticated call provider and does not explicitly check either participant's suspension status. It creates a pending call session directly. The live `call_sessions` RLS policies also permit participant UPDATE and paid/matched INSERT without the final provider/suspension checks.

Production `public.call_sessions` currently grants authenticated users SELECT, INSERT, UPDATE and DELETE. The PR migration revokes direct client writes, replaces call creation with a fail-closed function, and restricts status changes to a participant-scoped RPC. Until that migration is applied safely, calls must not be described as JWT-authenticated/private.

The candidate JaaS Edge Function is source-only, not deployed. It validates the Supabase user, exact participant membership, accepted/unexpired state, then calls the service-only `call_session_token_eligible` RPC. That RPC checks the private provider switch, both suspensions, both directions of blocking, exact room/session eligibility. The provider switch defaults OFF. JaaS credentials are not configured. The UI remains disabled.

## Direct table grants observed

- `public.profiles`: authenticated has DELETE, INSERT and UPDATE.
- `public.call_sessions`: authenticated has DELETE, INSERT, SELECT and UPDATE.
- `public.campagnes`: authenticated has DELETE, INSERT, SELECT and UPDATE; Security Advisor reports RLS enabled with no policies, so row access is currently blocked by RLS. The candidate migration revokes these unnecessary grants.
- `public.paiements`: authenticated has INSERT, UPDATE, DELETE and SELECT grants; RLS limits reads to owner/admin and permits owner payment submission. Candidate migrations remove direct UPDATE/DELETE and pause intake until the owner confirms the receiving SIM and launch activation.
- `public.config`: authenticated has SELECT under a `USING (true)` policy. The only current keys are `airtel` and `orange`; candidate migrations narrow or hide this while intake is paused.
- `public.statuts`: authenticated has SELECT under a `USING (true)` policy. A test authenticated context could read 3 entitlement rows. Candidate migration restricts direct reads to the owner and exposes only guarded boolean badges.
- `public.prives`, `public.login_names` and `public.deblocages` have broad table grants, but current RLS policies constrain private data to owner rows or provide no write policy. Grants alone do not establish a bypass; effective privileges plus RLS must be assessed together.
- The other 11 tables in the current RLS-without-policy advisory sample have no anon/authenticated/PUBLIC table grants. These findings are not evidence of a bypass by themselves; their lack of policies may be intentional for service-only data.

No broad anonymous table grant was returned for the inspected tables.

## Security Advisor snapshot

Observed 26 Nov 2026:
- 1 SECURITY DEFINER function callable by anon: `public.get_malachite_referrer_preview(uuid)`. Its current body returns only `prenom` and `username` where `profile_private=false`. This may be intentional for referral display; retain only if public preview is a product requirement and test privacy behaviour.
- 9 SECURITY DEFINER functions callable by authenticated users, including admin/referral, founder finance, Match and call RPCs. Each needs function-by-function authorization review; do not revoke all indiscriminately because legitimate client RPCs may depend on them.
- 12 RLS-enabled tables with no policies. Eleven of the inspected tables have no client grants; `public.campagnes` has authenticated grants but RLS denies access without policies.
- Leaked-password protection is disabled. This is an Auth configuration item; enable after checking password reset/sign-in compatibility and informing the owner.
- No automatic daily downloadable backups are included on the Free plan. Supabase recommends regular CLI logical exports and off-site retention. Storage object binaries need a separate export.

## Profile and storage privacy snapshot

Read-only counts at 26 Nov 2026, 13:09 UTC: 5 profiles, 0 currently private profiles, 24 objects in `profile-photos`, 12 call-session rows, 8 payment rows, and 3 entitlement-status rows visible under a test authenticated context. No member rows or storage objects were modified.

The installed `profiles` SELECT policy does not check `profile_private=false`; it only excludes blocked/suspended profiles. Authenticated clients currently have SELECT on all profile columns, including age, bio, interests, photos, prompts, and `profile_private`. Because there are currently no private profiles, no existing private-profile row leak was observed. However, a future private profile would not be protected by the installed policy. The installed `profile photos read` storage policy also lacks the public-profile/listed-path checks and would expose non-blocked profile folders. The candidate owner-only private-profile migration replaces these policies and its isolated two-account privacy tests pass in CI.

## SECURITY DEFINER function review

Nine public SECURITY DEFINER functions are executable by authenticated users. Read-only body review:
- `admin_malachite_referrals`, `founder_business_overview`, and `founder_finance_summary` explicitly require a signed-in user and `private.is_admin()` before returning admin/finance data.
- `est_match`, `match_like_quota`, `match_received_likes`, and `match_relation_compatible_ids` delegate to private SECURITY DEFINER functions that require `auth.uid()`, reject suspended callers, and filter private/blocked/suspended targets where applicable.
- `get_malachite_referrer_preview` is intentionally anonymous and returns only public `prenom`/`username`, but its production definition does not exclude suspended referrers or apply the authenticated viewer's block relationship. Candidate migration `20261124170000_harden_call_and_referrer_access.sql` adds those checks; retain anonymous execution only if public referral previews are intended.
- `start_call_session` checks identity, entitlement, mutual match and blocks, but does not require an authenticated provider or reject suspended participants. Candidate fail-closed migration disables it until JaaS is configured.

No blanket revoke is recommended: the reviewed Match/admin wrappers have meaningful caller/role checks, while the referral preview and call entrypoint need their targeted candidate fixes.

## Backup and restore evidence

NOT CERTIFIED:
- No production logical dump is present in this repository or evidenced in the connected tool results.
- No off-site encrypted copy/checksum receipt is evidenced.
- No isolated restore drill has been completed.
- The database connection password is not available through the connected tools. Do not request it in chat or commit it. The owner must use the Supabase Dashboard/CLI from a trusted terminal to perform the export and provide only non-secret evidence (file sizes, SHA-256 checksums, object counts, restore log summary).

## Next gates

1. Obtain a real off-site database export and Storage object export using the documented runbook; verify SHA-256.
2. Restore to an isolated Postgres 17/Supabase-compatible target; verify core tables, constraints, RLS, functions, auth records, and Storage object counts/checksums.
3. Reconcile all candidate migrations against that isolated target in dependency order; resolve every failure before production.
4. Review the 9 authenticated SECURITY DEFINER functions individually, the public referral preview, and Auth leaked-password protection.
5. Configure JaaS secrets in Supabase (never in chat or GitHub), deploy the candidate function, run two-account and negative-path tests, then only after approval plan production migration.
6. Keep PR #158 draft and keep calls disabled until every gate is evidenced.

## Result

Production is ACTIVE_HEALTHY but not launch-certified. Latest candidate CI at commit `fb4eeff7524e9bf793e9de66a127426546f4c257` passed all four workflows (13 validation jobs, isolated Match PostgreSQL runtime, release integration contract, and live Pages verification). These are candidate/CI results, not production migration or restore evidence. This audit is evidence of observed state, not a claim that production has been fixed.


## Follow-up implementation and CI evidence — 26 Nov 2026

Candidate branch follow-up:
- JaaS JWT corrected so the JWT `room` claim contains only the exact room name; IFrame `roomName` remains `<AppID>/<room>`, per the official 8x8 contract.
- Call UI no longer offers the unavailable Pass Appels; Premium wording says calls are included only after the secure service is reactivated.
- New migration `20261126150000_pause_call_pass_sales_until_jaas_activation.sql` rejects call-pass submissions and admin approvals while the private provider switch is OFF.
- Isolated SQL fixture and assertions cover both denied call-pass submission and denied validation. This test path passed.
- Latest CI commit `cfc6f2386de0caa010c16422bc7dc1df78645e07`: application/SQL validation passed; 13/13 validation jobs passed; isolated Match PostgreSQL runtime passed; release integration passed; live Pages verification passed.

Production was not changed. These changes remain in draft PR #158 pending backup/restore proof, full migration reconciliation, JaaS credentials and two-account end-to-end verification.


## SECURITY DEFINER function review

Read-only review of the nine authenticated SECURITY DEFINER findings:
- `admin_malachite_referrals`, `founder_business_overview`, and `founder_finance_summary` explicitly require an authenticated user and `private.is_admin()`; date ranges are validated.
- `est_match`, `match_like_quota`, `match_received_likes`, and `match_relation_compatible_ids` delegate to private functions that bind all results to `auth.uid()`; Match quota and received-like functions also reject suspended accounts, and received-like results exclude private, blocked, and suspended profiles.
- `get_malachite_referrer_preview` is deliberately anonymous-capable in the current schema and returns only `prenom` and `username` for a profile whose `profile_private=false`. Keep only if public referral attribution is intended; otherwise remove anonymous EXECUTE after confirming signup UX.
- `start_call_session` is the exception: current production version has no provider-authentication gate and no explicit suspension check. The candidate fail-closed migration disables its client entry point pending authenticated JaaS.

No blanket revocation was applied: it would break legitimate user-scoped RPCs. All reviewed functions use an empty search_path. This review does not replace isolated authorization tests for each RPC.


## Important qualification — live private-profile sample

The live production database currently contains 5 profiles, all 5 public and 0 private. It also contains 24 objects in the `profile-photos` bucket. The read-only query returned 0 visible private profiles/photos, but because no private profiles currently exist, that result does **not** prove the private-profile policy against a real private account. The isolated `private-profile-projection`, `private-profile-access`, and `profile-photo-visibility` CI fixtures are the meaningful tests for those cases. A real two-account production smoke test should be performed only after an approved, controlled private test profile exists.


## Additional confirmed production entitlement-privacy gap

Production still has the `public.statuts` SELECT policy `voir les statuts` with `USING (true)`; authenticated users currently have SELECT on `user_id`, `premium_until`, `boost_until`, and `verified_until`. This exposes other members' exact entitlement timestamps. The pending migration `20261124200100_limit_entitlement_status_visibility.sql` changes direct reads to own-row only and exposes other public members' status as boolean badges through `public.public_status_badges()`. The candidate `app-core.js` has already been changed from `statuts.select('*')` to that RPC, so the privacy migration and client cutover must ship together. Do not apply the database migration alone ahead of the client update.


A read-only transaction executed under the `authenticated` role with one real profile's JWT subject confirmed the issue quantitatively: that member could read 3 entitlement rows while owning only 1 (`visible_rows=3`, `own_rows=1`). No row values were retrieved. This is a confirmed production exposure, not just an Advisor inference. The client/RPC cutover and policy restriction remain coupled and are not applied to production because the rest of the migration chain has not yet been reconciled.


## Additional profile-photo access gap in live production

The current production `storage.objects` SELECT policy for `profile-photos` permits any authenticated, non-blocked member to read objects in another member's folder. It does not require the object to be listed in `profiles.photos` and does not check `profile_private`. A read-only test under one member's JWT saw 3 other-member photo objects; all 3 currently matched published photo paths. There are currently 0 private profiles, so exposure of private/unlisted photos is not demonstrated in today's data, but the policy would permit it if such objects existed. Candidate migration `20261124150100_secure_private_profile_access.sql` replaces this with owner-only access for private profiles and published-path-only access for public profiles. This migration and the profile client behavior must be validated and deployed as a coordinated change.


## Chat-media authorization hardening

Production's current `chat-media lire` Storage policy authorizes reads solely from the sender/recipient folder segments. It does not independently verify that the object is attached to a message row or re-check block/suspension state. A read-only sample for the most active member saw 31 accessible chat-media objects and no other-member object without a visible message; no actual orphan exposure was demonstrated in that sample. Candidate migration `20261126160000_harden_chat_media_read_access.sql` replaces the folder-only rule with a message-linked participant check and block/suspension checks. An isolated PostgreSQL test now covers valid recipient access, orphan denial, block denial, and both sender/receiver suspension. This is defense-in-depth and remains unapplied to production pending migration reconciliation.


## Age enforcement gap in the live trusted write path

The installed production `public.save_my_profile(jsonb,jsonb)` checks age only when `p_private.profile_age` is non-null and only rejects values below 18. It does not require a value or enforce the upper bound of 100 in that function. The current UI validates age, and the current profile sample contains no invalid ages, but a direct RPC caller can bypass the browser validation. Pending migration `20261124250000_enforce_profile_age_server_side.sql` replaces the RPC with strict 18–100 integer validation and consistency checks between private/public age fields; later migrations restrict direct profile writes to this trusted RPC. Apply those changes only as part of the reconciled migration/client deployment.


## Latest isolated verification — 26 Nov 2026

Candidate commit `223185ba4232cb783b507b4d45df64ac06287c4b` passed:
- 14/14 Malachite validation jobs, including the new chat-media RLS fixture and all existing profile, age, call, payment, deletion and ACL fixtures.
- Isolated Match PostgreSQL runtime.
- Release integration contract.
- Live GitHub Pages verification.

The subsequent documentation-only commit `09a965ae75382082dbca185bf3d01791e5e60a16` also passed all four workflow groups: validation, Match runtime, release integration and live Pages. These are isolated CI and live-site checks; they do not certify production migrations, backup restore, or JaaS two-account calls.


## Existing paid call entitlements — protect members

A read-only aggregate snapshot shows 2 distinct members with currently active `Appels` passes, 2 distinct members with active Premium, and 0 pending payment declarations. No member identities or payment references were retrieved. Production's current `calls.js` still exposes the legacy public `meet.jit.si` call flow; the candidate branch disables that UI until JaaS is authenticated and blocks new Appels submissions/approvals. Because existing Appels passes are prepaid, candidate migration `20261126170000_preserve_call_pass_time_while_provider_disabled.sql` records provider downtime and extends the remaining active pass expiry by that downtime when JaaS is re-enabled. Its isolated test passed. This pause begins only after that migration is applied; production has not been changed, so current pass expiry clocks are still running.


## Latest candidate verification — 26 Nov 2026

Candidate branch head verified: `918a399a2acf71c2ee9607b059f52b76ec07d31e`.

All four workflow groups on this head completed successfully:
- Malachite validation: success; all 14 jobs passed, including effective authenticated ACL, private profile access/projection, profile-photo visibility, entitlement-status visibility, server-side age, chat-media access, call expiry/suspension/participant authorization, payment-intake pause and account-deletion FK assertions.
- Match isolated PostgreSQL runtime: success.
- Release integration contract: success.
- Live GitHub Pages verification: success.

The latest candidate adds explicit reassertion migrations for private-profile and published-photo access, plus owner-only exact entitlement timestamps and guarded public boolean status badges. These migrations and their SQL assertions passed in isolated CI. The frontend/RPC and migration must be released together to avoid breaking status badge loading.

This does not change production readiness: production has not received these migrations or client changes. PR #158 remains open/draft. No production database, Auth setting, Storage object, payment configuration, or Edge Function was changed. Backup plus isolated restore remains NOT CERTIFIED; migration-ledger reconciliation, recovery of missing historical migration sources, and authenticated JaaS end-to-end tests remain hard deployment gates. Calls remain disabled in the candidate until JaaS secrets, deployment, and two-account private-room tests are completed.


## Verification refresh — 26 Nov 2026, latest PR head

PR #158 head `519636adb171593ed1e7c6f9b0c3ea2a274588b7` completed all four workflow groups successfully after the audit refresh:
- Malachite validation: success.
- Match isolated PostgreSQL runtime: success.
- Release integration contract: success.
- Live GitHub Pages verification: success.

This is candidate CI evidence only. The PR remains draft and production remains unchanged; the backup/restore, migration reconciliation, and authenticated JaaS gates above still apply.


## Migration inventory refresh — read-only, 26 Nov 2026

A fresh read-only comparison returned 65 production migration-ledger records, ending at version `20261124122733` (`account_deletion_fk_cleanup`), and 87 migration SQL files on the candidate branch. There are 35 filenames whose numeric prefixes sort after that recorded version. **These 35 are only timestamp-based candidates, not a certified pending-migration list**: the ledger contains aliased/renamed names and earlier files may already have been applied under different recorded versions. Do not batch-apply these 35 or infer that all are missing. Next safe reconciliation step is to map each candidate's SQL effects to the live schema and existing ledger, then validate the exact ordered set against a production-equivalent restore.


## Confirmed profile-save failure in live production — 26 Nov 2026

A read-only review of production logs found five HTTP 403 responses to `POST /rest/v1/rpc/save_my_profile` from the live Android/Chrome client (06:24 and 07:56 UTC). The matching OPTIONS requests succeeded. No request payload or member profile data was retrieved.

The production function is currently SECURITY INVOKER and ends with `RETURNING *` from `public.profiles`. Authenticated users have INSERT/UPDATE on `profiles` but **do not have SELECT** on that table. This privilege mismatch is consistent with the observed 403 when the function tries to return the saved profile. The production function also performs writes to `prives` and `login_names`, whose current owner-only RLS policies otherwise permit the caller's own row.

Candidate migration `20261124260000_restrict_profile_writes_to_trusted_rpc.sql` changes `save_my_profile` to SECURITY DEFINER with an empty search_path, retains explicit `auth.uid()` and profile-owner checks, validates age and avatar inputs, and removes direct client write privileges while preserving the narrow last-seen update. This is the intended paired fix for the observed profile-save failure and the direct-write security gap. The candidate migration and related profile-age/ACL fixtures pass isolated CI.

**Impact:** profile creation/editing may fail for users on the current production schema. The exact 403 SQLSTATE is not present in the available edge request log, so the privilege mismatch is a strongly supported root cause rather than a captured PostgREST error body. Do not apply the candidate migration alone or directly to production before backup/restore certification and migration-chain reconciliation.

## Expired signed avatar URL diagnosis — 26 Nov 2026

A read-only Storage-log review identified 17 failed signed-URL reads for the same profile-avatar object. Storage recorded `InvalidJWT` with the explicit message that the `exp` claim timestamp had failed; the token was several days old. This is an expired signed-URL cache issue, not evidence of an object deletion or bucket outage.

Candidate `calls.js` now removes the persistent `localStorage` cache for signed Storage URLs and keeps only an in-memory cache with a monotonic TTL. This prevents a device clock that is behind from reusing a server-expired token across days. The change passed the full 15-job validation run plus Match, release-contract and live-Pages workflows on candidate commit `64038d179c65de0a9f0f2fe3e9b3903799f0151b`. It is not live until the candidate is safely released.


## Additional direct-RPC and table-grant verification — 26 November 2026

A second read-only catalog check confirmed the following live production privileges:

- `authenticated` can execute `public.start_call_session(uuid, uuid, text, text, timestamptz)`. The current function is SECURITY DEFINER. The client-side `CALL_PROVIDER_ENABLED=false` gate prevents the shipped UI from starting calls, but the database RPC is still directly executable by authenticated clients until the candidate fail-closed migration is applied. Do not re-enable calls or treat the UI flag as the security boundary.
- `public.save_my_profile(jsonb,jsonb)` remains SECURITY INVOKER, while `authenticated` has direct INSERT, UPDATE and DELETE grants on `public.profiles`. This is consistent with the observed profile-save permission failures and is why the profile RPC cutover and direct-write revocations must be applied together after migration reconciliation.
- The candidate staging database reports `save_my_profile`, `start_call_session`, `update_my_call_session_status`, and `call_session_token_eligible` as SECURITY DEFINER. Staging provider remains disabled. This is not evidence that production has received these changes.

These findings are production risk evidence, not authorization to mutate production. Keep calls disabled in the UI and do not apply candidate migrations until the backup/restore and migration-history gates are satisfied.


## Live profile-save error count — 26 November 2026

A fresh aggregate of production logs for 26 November found 12 `permission denied for table profiles` errors and 12 corresponding HTTP 403 responses from `rpc/save_my_profile`, affecting one authenticated account in the observed log window. No account identifiers, IP addresses, or request payloads are retained in this report. This confirms the profile-save defect is still occurring in production at the time of the check. The staging profile RPC cutover passed the age, owner-isolation, and private-profile tests, but production remains unchanged; do not represent this as fixed until the reviewed migration is safely released and a real authenticated profile-save succeeds.


## Supabase security advisor cross-check — 26 November 2026

Production security advisor snapshot:
- 12 RLS-enabled/no-policy notices. The listed tables are private/admin/service-worker/retired tables intended to deny browser-role row access; verify grants separately rather than treating this informational rule as a leak.
- 1 anon-executable SECURITY DEFINER RPC: `get_malachite_referrer_preview(uuid)`. Its source returns only the name/username of a non-private, non-suspended profile and is designed for public referral previews; keep its output constraints and review if referral preview behavior changes.
- 9 authenticated-executable SECURITY DEFINER RPC findings. A fresh catalog check confirms `founder_finance_summary(timestamptz,timestamptz)` is still executable by authenticated in production, although its function body checks admin status. PR #158 revokes browser-role execution and grants service_role only. `start_call_session` is also still executable by authenticated in production and is disabled only by the client flag today; candidate migration revokes it and makes the database boundary fail-closed. Other listed admin RPCs include internal `private.is_admin()` checks; member-scoped match/block/notification RPCs validate `auth.uid()` in their underlying private functions. The advisor is a conservative EXECUTE warning, not proof that each function leaks data.
- Leaked-password protection remains disabled; changing the project plan or Auth setting is outside this safe staging-only work.

The staging advisor still reports several SECURITY DEFINER wrappers even where direct `has_function_privilege` checks confirm the candidate has revoked access (notably `founder_finance_summary`). For release decisions, use the live catalog privilege check and negative-path SQL tests in addition to the advisor output; do not blindly revoke every SECURITY DEFINER function because some are intentionally owner-scoped APIs.


## Current production RLS policy snapshot — 26 Nov 2026

A fresh catalog read confirms the privacy and call hardening gaps remain live in production:

- `public.profiles` SELECT policy allows every authenticated member to read profiles unless blocked or suspended; it does not exclude `profile_private=true`.
- `storage.objects` policy `profile photos read` allows reads from another member's `profile-photos` folder unless blocked; it does not require a public profile or a path listed in that profile's published photos/avatar.
- `public.statuts` SELECT policy is `USING (true)`, exposing entitlement rows to authenticated members.
- `public.call_sessions` still has authenticated INSERT and UPDATE policies; the insert policy checks match and paid entitlement but does not require an authenticated JaaS provider. The update policy is participant-only, not a narrow transition RPC.
- `public.paiements` still accepts authenticated pending declarations for Premium, Boost and Appels. The candidate pauses Appels pass intake while the secure provider is unavailable.

The candidate staging tests verify private-profile/photo denial for non-owners, entitlement visibility restrictions, direct call creation denial and participant-scoped chat/call access. Production has not received those migrations. This is a verified release blocker, not a hypothetical checklist item.


## Published-source call path check — 26 Nov 2026

The repository's current `main` branch `calls.js` still loads `https://meet.jit.si/external_api.js` and creates `JitsiMeetExternalAPI('meet.jit.si', ...)` rooms. The PR #158 candidate branch instead disables the call inbox/start path and uses the authenticated JaaS token issuer. Therefore the currently published source still contains the legacy public Jitsi path; the candidate's fail-closed change is not live. Do not describe production calls as private or secure, and do not accept/validate paid call passes. A controlled frontend release plus the database call-session hardening is required. No production source or database changes were made in this audit.


## Recheck — 27 November 2026 (read-only production + CI)

Production catalog and migration ledger were re-read through the connected Supabase project. No production DDL, data, Auth configuration, Storage policy, Edge Function, payment setting, or release flag was changed.

- Migration ledger: 65 entries; latest `20261124122733` (`account_deletion_fk_cleanup`).
- `save_my_profile` remains SECURITY INVOKER.
- `public.update_my_call_session_status(uuid,text)` is absent in production.
- Authenticated still has direct INSERT/UPDATE on `profiles`, INSERT/UPDATE on `call_sessions`, UPDATE on `paiements`, and SELECT on `campagnes`. `campagnes` has zero RLS policies.
- `private.call_provider_config` and `reject_expired_call_acceptance` trigger are absent.
- Supabase security advisor still reports leaked-password protection disabled and SECURITY DEFINER execute warnings; these require per-function review, not blanket revocation.
- Aggregate logs in the available 24-hour window contained 12 profile-save 403s and 12 corresponding `permission denied for table profiles` events. Newest matching log was 27 Nov 2026 03:56 UTC; this log window is not evidence of successful profile saving after that point.
- Candidate commit `6db51f3f0b0684e3db74e2a42f3a2ebc6bc10392` now has 17/17 Malachite validation jobs passing after retrying the call/appointment participant-access container job. Match isolated PostgreSQL runtime, release integration contract, and live Pages verification also passed on that commit.

The candidate remains CI/staging-verified only. Migration alias/source recovery, a real off-site DB and Storage backup plus isolated restore, Auth leaked-password protection, and configured JaaS with two-account private-room tests remain open release gates. Keep calls and call-pass intake disabled until the provider gate is completed. No production migration was applied.


## Staging database ACL recheck — 27 November 2026

The isolated Supabase staging project `sbawknyxcjslvhknomkd` is ACTIVE_HEALTHY (PostgreSQL 17.12). A read-only catalog check confirms the candidate migration state is installed there:

- 73 migration ledger rows; latest `20261126202219` (`add_fk_supporting_indexes`).
- `save_my_profile` is SECURITY DEFINER; authenticated has no direct INSERT or UPDATE on `profiles`.
- `update_my_call_session_status(uuid,text)` exists.
- Authenticated cannot execute `start_call_session` directly and has no direct INSERT/UPDATE on `call_sessions`.
- Private provider configuration exists and is OFF.
- Authenticated has no direct INSERT on `paiements`.

This confirms the intended ACL/provider fail-closed state in the connected staging database, not production. No staging data or schema was changed during this check.


## Production member/call aggregate recheck — 27 November 2026

Read-only counts only; no member identities, payment references, or message content were selected:

- 5 profiles total; 0 currently marked private. This does not validate the private-profile policy, which remains broad and must be fixed before members use privacy mode.
- 12 historical call-session rows; 0 pending and 0 accepted at the time of this query; 2 expired.
- 2 distinct members currently hold active paid Appels entitlements.
- 0 pending payment declarations.

The active Appels entitlements must be preserved when the provider is safely disabled/paused; the candidate includes downtime accounting for the eventual authenticated-provider reactivation. Production remains on its existing call path and no entitlement clocks or payment rows were modified during this check.


## Direct policy/catalog recheck — 27 Nov 2026

Read-only production catalog queries confirmed the launch-critical privacy gaps remain in the live policy definitions:

- `public.profiles` SELECT policy `voir profils` permits any unblocked, unsuspended authenticated member to read a profile; it does not exclude `profile_private=true`.
- `storage.objects` SELECT policy `profile photos read` allows reads from the `profile-photos` bucket when the path owner is not blocked. It does not check `profile_private=false`, published photo paths, or suspension. This is a direct private-photo visibility gap.
- `storage.objects` SELECT policy `chat-media lire` authorizes by folder participant only, not by a real message attachment; candidate migration replaces it with message-bound access and block/suspension checks.
- `public.messages` SELECT/INSERT policies do not consistently reject suspended conversation participants; candidate migration adds the suspension/account-existence conditions.
- `public.statuts` SELECT policy `voir les statuts` remains `true`, exposing raw entitlement expiry fields to authenticated members; candidate replaces it with owner-only rows plus a limited boolean badge RPC.
- `public.call_sessions` still has authenticated INSERT and UPDATE policies/grants for the legacy public Jitsi path. Candidate closes direct client writes and fails closed until private JaaS credentials and tests exist.

Production Storage bucket metadata confirms `photos`, `profile-photos`, `chat-media`, and `payment-receipts` are private buckets. Private bucket status alone does not fix the overly broad authenticated SELECT policies above.

These findings were obtained by read-only catalog inspection on 27 Nov 2026. No policy, bucket, member row, or production setting was changed.

## Advisor refresh — 27 Nov 2026, 04:18 UTC

- Supabase production health advisor returned no health findings.
- Production performance advisor returned 19 INFO-level unused-index notices. These are not grounds for dropping indexes during launch stabilization; usage statistics are low-volume and no index was removed.
- Production security advisor still reports leaked-password protection disabled, one intentionally public SECURITY DEFINER referral-preview RPC, nine authenticated SECURITY DEFINER RPCs requiring per-function authorization review, and 12 RLS-enabled tables without policies (many are private-schema or service-only tables; classify individually rather than adding permissive policies).
- Staging performance advisor's two unindexed-FK findings concern `conversation_pair_index.member_high` and `messages.sender_id`; production catalog previously confirmed `conversation_pair_index` is absent and production `messages.sender_id` is absent. Do not promote staging-only index fixes.

No schema, index, Auth configuration, or production data was changed during advisor review.

## Recent live request-log recheck — 27 Nov 2026

- Edge gateway logs show 12 HTTP 403 responses for `rpc/save_my_profile` in the observed 24-hour window, with hourly clusters on 26 Nov at 06:00, 07:00 and 19:00 UTC. No later 403 was present in the returned edge-log window; this is not proof that the RPC is fixed because the live SECURITY INVOKER ACL remains unchanged.
- The live Pages signed-photo cache fix is holding in the available logs: 34 signed `profile-photos` requests returned HTTP 400 in older clusters on 26 Nov (04:00–07:00 and 19:00 UTC), and the read-only query found **zero** further such 400s from 26 Nov 20:00 UTC through the current log window.
- Successful edge function log counts in the current window: `malachite-admin-push` 1,382 HTTP 200; `malachite-ai-worker` 91 HTTP 200; `username-login` 4 HTTP 200. This confirms observed calls succeeded, not full functional coverage or absence of unlogged errors.

Only aggregate route/status/time counts were queried; no user IDs, IP addresses, message bodies, receipts, or credentials were selected.

## Operations worker and admin push read-only check — 27 Nov 2026

- AI briefings setting is enabled. Cron `malachite-ai-ops-worker` is active every 15 minutes; entitlement-expiry notifications remain active every 5 minutes.
- `ai_ops_runs`: 598 success, 7 partial; latest successful run 27 Nov 04:15 UTC. All 7 partial runs were recorded with `gemini_http_503`, latest 26 Nov 02:45 UTC. No current run failure was observed in the aggregate status query.
- AI alerts: two resolved alerts (one warning, one info). Review queue: one awaiting-human payment-review task and one completed support-review task. The payment-review task's source payment is already `valide`; it is a stale admin queue item, not a pending payment. It was not changed because candidate cleanup is intentionally gated on safe deployment.
- Admin push queue has zero pending/delivered rows and one active subscription. The worker endpoint has successful observed 200s, but no queued payment event was present to test end-to-end delivery during this read-only check.

No payment status, AI review task, alert, push subscription, or cron job was modified.

## Deployed Edge Function source comparison — 27 Nov 2026

Production `username-login` is still deployed at version 7. Its live source uses a count-then-insert rate limit and accepts fallback `x-real-ip` / `x-forwarded-for` values, which can be caller-controlled on some request paths and are not atomic under concurrency. The candidate source uses a database-atomic `consume_username_login_attempt` RPC, requires the trusted Cloudflare `cf-connecting-ip` header, and fails closed if the edge IP is unavailable. The candidate throttle tests passed in the prior 17/17 validation suite, but this fix is not deployed to production.

Production `malachite-ai-worker` version 14 and `malachite-admin-push` version 6 are active with `verify_jwt=false`; both perform their own server-side HMAC/admin authorization checks. The worker signature RPC uses a five-minute timestamp window and the deployed worker caps Gemini briefing generation to one per six hours. The worker's latest successful aggregate run was 27 Nov 04:15 UTC. The admin push endpoint has no pending queue item in the current snapshot, so end-to-end push delivery was not exercised.

No Edge Function deployment or secret/configuration change was performed.

## Current production aggregate snapshot — 27 Nov 2026

Fresh read-only counts: 5 profiles total, 0 currently marked private, 0 pending/accepted call sessions, 0 pending payment rows, and 2 active Premium entitlement rows. This means no active call session or payment review is in progress at this snapshot; it does **not** remove the privacy defect because members can still switch their profiles to private under the current broad policy.

No individual IDs, payment codes, profile contents, messages, or receipt contents were selected.

## Release workflow hardening — 27 Nov 2026

The candidate production publish workflow now has independent fail-closed checks for: DB security readiness; off-site backup + isolated restore; leaked-password protection; private JaaS call verification; privacy/RLS negative-path verification; account-deletion/retention/Storage cleanup verification; clean migration replay after source reconciliation; payment push end-to-end verification; and explicit launch approval. Each has a separate GitHub repository variable, all defaulting to an unset/false state.

Workflow change commit: `5e3da42a6bc25953cd542ffc45e45cbc9d94820d`. GitHub created validation, live Pages, Match runtime, and release integration runs for this head; they were queued at the time of this audit. Do not mark this workflow certified until all runs finish successfully. No readiness variables were set and no production deployment was triggered.

## Stale AI payment review item — safely reconciled 27 Nov 2026

Read-only inspection showed one `payment_review` queue item remained `awaiting_human` even though its source payment had already been marked `valide` by a human; its queue timestamp was 21 Nov. The production AI worker's current successful run did not reconcile this old item, although the candidate worker code contains the reconciliation routine.

I performed a narrowly scoped production update: only queue rows where `task_type='payment_review'`, `status='awaiting_human'`, and the linked payment's existing `statut='valide'` were marked `completed`, with a note that no payment or entitlement was changed. Exactly **1** stale review task was closed. No payment record, entitlement, user, receipt, or Premium activation was modified.

## RLS-enabled/no-policy table classification — 27 Nov 2026

Fresh production catalog classification: the private-schema `admins`, `founder_finance_ledger`, and `match_daily_like_events` tables have no policies and no anon/authenticated table grants; this is intentionally fail-closed. `admin_push_queue`, `admin_push_subscriptions`, `ai_manager_audit`, `ai_ops_runs`, `malachite_ai_alerts`, `malachite_ai_review_queue`, `malachite_ai_settings`, and `malachite_referrals` likewise have no browser grants; service-role/server paths are expected. These should not receive broad policies just to silence the advisor.

Exception requiring cleanup: `public.campagnes` has RLS enabled and zero policies but still has authenticated SELECT and INSERT grants. RLS currently blocks rows, but stale grants are unnecessary attack surface; candidate migration `20261126230000_revoke_retired_campaign_table_access.sql` revokes them because campaigns/sponsoring are out of launch scope. No grants were changed in production during this review.