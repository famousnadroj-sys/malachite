# MALACHITE — production drift audit (read-only)

Date: 2026-11-25  
Production Supabase project: `tscsmemsvgacqioncash`  
Reviewed branch: `security/rebased-private-profile-access-v4` (PR #122)

## Scope and safety

This review used read-only queries against production. No production migration, SQL mutation, Edge Function deployment, bucket change, account operation, or payment operation was performed.

The branch PR #122 remains open and draft. Its migrations are not yet applied to production. Do not merge or deploy the frontend independently: the frontend depends on the RPCs and policies introduced by the migrations.

## Confirmed production state

### Storage buckets

All six inspected buckets are configured as private:

- `chat-media`
- `photos`
- `profile-photos`
- `payment-receipts`
- `malachite-campaigns`
- `malachite-campaign-media`

This confirms the campaign buckets are private in production at the time of this audit. It does not prove that every object path is authorized correctly; the object policies must also be reviewed.

### Profile-photo read policy

Production still has the older `profile photos read` policy. It allows reads for the owner or when the profile owner is not blocked, without requiring the requested object path to appear in the published `profiles.photos` list and without checking the profile's private flag or suspension status.

PR #122 replaces that policy with `profile photos read published paths`, limiting reads to the owner or a currently published photo on an eligible public profile. This is a material security improvement, but it is not active in production until the reviewed migration is deployed.

### Call-session RPC

Production `public.start_call_session` currently checks authentication, call entitlement, reciprocal match, blocks, and call expiry. The live definition inspected does not include the newer provider-configuration kill switch or suspension checks.

PR #122 introduces a private provider configuration defaulting to disabled, requires the provider to be enabled before creating a call session, and rejects suspended callers or recipients. This change is not active in production.

The browser call client still joins the public `meet.jit.si` service without a Jitsi JWT. A private, controlled Jitsi deployment and a server-side short-lived JWT issuer are still required before calls can be called participant-authenticated. Do not enable the provider flag until that architecture is implemented and tested.

### Profile writes and age enforcement

Production still has the earlier `save_my_profile` implementation. PR #122 adds strict server-side age validation (18–100, including the private age field) and restricts direct profile/private/login-name writes so the trusted RPCs are the write path. These protections are tested in the PR's disposable PostgreSQL CI fixtures but are not yet active in production.

### Account deletion

No self-service account-deletion function or frontend action was found in the reviewed branch. The existing account-deletion migration only makes selected audit references nullable with `ON DELETE SET NULL`; it does not delete accounts, profile records, messages, payments, or Storage objects.

A complete deletion flow remains blocked on a documented retention decision, ownership-checked object cleanup, session revocation, safe treatment of conversations and moderation evidence, and tests proving another member's data is not deleted.

## Test/staging environment note

The separate staging project currently reports the two campaign buckets as public, while production reports them private. This is an environment drift, not evidence that production buckets are public. Before using staging as a faithful release rehearsal, apply and verify the relevant campaign-retirement migration there through the approved staging workflow.

## Release gates still open

1. Review and approve the data-retention policy with qualified RDC legal/accounting advice.
2. Implement and test account deletion, including Storage cleanup and session invalidation.
3. Deploy and validate the private call-provider/JWT architecture, or keep calls disabled.
4. Apply PR #122 migrations to staging and run two-account/two-device tests.
5. Verify a restorable backup and rehearse the coordinated database + frontend deployment.
6. Leaked-password protection: Supabase documents this feature as Pro Plan and above. The current organization is on Free, so this setting cannot be enabled without a paid-plan decision. Until then, document the accepted limitation and enforce the strongest available password policy/rate limits; do not claim leaked-password checks are active. Reference: https://supabase.com/docs/guides/auth/password-security.
7. Obtain explicit approval before any production migration or deployment.

## Validation evidence

At the time this audit note was prepared, PR #122 commit `3ae55ccc558523b5c74b33dc5f92be790702e28a` had 14/14 validation jobs and the isolated PostgreSQL runtime job successful. A passing CI run does not mean the corresponding migrations are deployed to production.



## Additional Storage access and ownership review (25 November 2026)

### Production access-policy gap: chat media

The production policy `chat-media lire` currently permits an authenticated user to read an object when their UUID appears in either the first or second path segment. It does not itself require a corresponding message row, an active sender and recipient, or the absence of a block.

The branch migration `20261124180000_secure_chat_message_and_media_access.sql` replaces this with a message-linked policy. The object must match `messages.media_url`, have an allowed media type, and the reader must be one of the two participants; both accounts must be unsuspended and the relationship unblocked. The matching insert policy also verifies that the recipient exists and is not suspended. This is a significant production security gap until the migration is applied.

The legacy `photos` bucket read policy in production does check that a matching message exists and checks suspensions and blocks. The PR's `20261124220000_harden_legacy_chat_media_reads.sql` keeps this rule aligned with the stricter message-linked path.

### Storage ownership conventions

The frontend upload paths inspected use account UUID prefixes:
- Profile photos: `<owner-uuid>/<filename>`
- Chat media: `<sender-uuid>/<recipient-uuid>/<filename>`
- Payment receipts: `<owner-uuid>/<receipt-id>.<extension>`

The production Storage policies also constrain profile-photo uploads/deletes and receipt uploads/deletes by the first path segment. This gives a useful ownership signal for a future account-deletion service, but it is not sufficient by itself to authorize deletion of every object: message references, avatar references, payment retention and historical data must still be evaluated.

### Object inventory snapshot

Read-only counts from production at the time of this review:

| Bucket | Objects | Notes |
|---|---:|---|
| `chat-media` | 31 | 30 matched a message reference; 1 did not match the simple reference check |
| `profile-photos` | 24 | 5 referenced by current profile photo arrays or avatar imagePath; 19 had no current profile reference |
| `photos` | 9 | No current message reference matched the legacy URL pattern |
| `payment-receipts` | 2 | 1 linked to a payment row; 1 was not linked by receipt_path |

These are **candidate unreferenced objects, not confirmed disposable files**. The simple inventory checks do not prove an object is unused: references may be encoded in older formats, another table, pending uploads, or a historical workflow. No object was deleted, moved, or modified. The 19 profile-photo candidates may include prior avatar renders; the payment-receipt candidate must be treated as potentially important evidence until reconciled.

### Consequence for account deletion

A future deletion worker must not simply delete every object whose first path segment equals the user UUID. It must:
1. Enumerate the user's owned objects in each private bucket.
2. Reconcile profile photo arrays, avatar imagePath, message media_url, payment receipt_path and any other retained references.
3. Apply the approved retention/anonymization policy to conversation and payment evidence.
4. Delete only objects confirmed eligible under that policy, using service-side ownership checks and an idempotent job record.
5. Record counts and outcomes without copying private file contents into logs.
6. Test with synthetic accounts, including a shared conversation, blocked pair, suspended account, linked receipt and unlinked upload.

No cleanup has been run in production.



## Production Edge Function review (25 November 2026)

Read-only source retrieval was performed for the three active production Edge Functions configured with `verify_jwt=false`. No function was deployed or changed.

### `malachite-admin-push` — version 6

The non-webhook path does not rely on gateway JWT verification: it extracts a Bearer token, calls `auth.getUser(token)`, then checks the authenticated user's `malachite_ai_manager_is_admin()` RPC before device registration, removal or test-push actions. This is a positive internal authorization gate.

The database-webhook path instead checks the `x-malachite-hook` value against the Vault-backed `malachite_push_hook` secret using a constant-time comparison. It only notifies administrators of queued pending payments; the source explicitly does not validate or activate payments. The `drain` action is also behind this shared secret.

Remaining hardening items: request-body size limits are not visible before JSON parsing; no explicit per-IP or per-hook rate limiter is present in the retrieved handler; the shared webhook secret is a single long-lived credential. Keep the secret private, rotate it under a controlled procedure, and consider bounded body size, delivery concurrency, per-hook rate limits and replay/idempotency protection. The allowed Origin is not an authentication control.

### `malachite-ai-worker` — version 14

The function verifies a timestamped HMAC over the exact request body by calling `verify_malachite_ai_worker_signature` before processing. The production SQL definition reads the secret from Vault, uses HMAC-SHA256, and rejects timestamps more than 300 seconds from server time. This is a real internal authentication control; `verify_jwt=false` alone is not evidence of public unauthenticated access.

The current signature verifier has a five-minute validity window but no nonce/consumed-signature table, so a captured valid signed request could be replayed inside that window. The request body is read fully before any explicit size bound. Add a maximum body size and replay protection or a strictly idempotent run key before treating this endpoint as fully hardened. Verify the caller's scheduling/pg_net path and ensure the HMAC secret remains Vault-only.

### `username-login` — version 7

This endpoint intentionally supports public username/password login and therefore uses its own password flow rather than requiring a pre-existing JWT. It uses a service credential internally to resolve username to the Auth email, then delegates password verification to Supabase Auth. It does not return the account email in its public error responses.

A rate limit exists: 15 attempts per IP hash in 15 minutes, with daily cleanup. However, the key is IP-only; there is no separate per-account/username throttling or progressive abuse control. The handler trusts `cf-connecting-ip`, `x-real-ip`, or `x-forwarded-for` headers; deployment must ensure the edge proxy overwrites/trusts these headers and direct callers cannot spoof the chosen address. The count-then-insert sequence is not atomic, so concurrent requests can exceed the threshold. The public `check` action also reveals whether a username is available (or belongs to the authenticated caller); assess whether this disclosure is intended and rate-limit it separately.

Recommended follow-up before launch: implement an atomic rate-limit RPC with both IP and normalized-username keys, verify trusted proxy behavior, add request-size bounds, and test concurrency, enumeration and credential-stuffing scenarios. Do not simply raise or remove the limit.

### Edge Function conclusion

No immediate proof of an unauthenticated administrative action was found in these three retrieved handlers: push administration checks a live admin session or a Vault secret, and the AI worker checks a short-lived HMAC. Nevertheless, request-size bounds, rate limiting and replay protections need work before launch. The username login endpoint is public by design and needs stronger abuse controls. This review covers only these three functions, not every deployed Edge Function.



### Remaining production functions configured with gateway JWT verification

The other three active production Edge Functions were also retrieved read-only:

- `admin-user-moderation` (version 5, `verify_jwt=true`): independently verifies the Bearer token with `auth.getUser`, then calls the database `moderate_user` RPC using the user-scoped client. The database allow-list is authoritative, self-moderation is rejected, and the source says the RPC prevents suspending another administrator. It uses the service-role client only after the RPC succeeds for follow-up administrative work. Add request-size bounds and explicit abuse throttling; verify the database RPC audit trail and failure behavior with negative tests.
- `malachite-ai-manager` (version 24, `verify_jwt=true`): independently verifies the user token and requires `malachite_ai_manager_is_admin() = true` before using the service-role client. The reviewed actions include dashboard/operations and human-reviewed tasks. It parses JSON before authentication and has no visible body-size bound in the handler. Add bounded request parsing and rate/concurrency limits; continue to keep privileged actions behind explicit admin authorization and human approval.
- `malachite-ad-creative` (version 6, `verify_jwt=true`): source is a small disabled/placeholder response handler; it does not appear to use a service-role client or perform privileged writes. Advertising surfaces remain excluded from the launch scope. Keep this function disabled or unreachable until a separately approved product decision; do not reintroduce ads in the current launch scope.

Production SQL ACLs for the inspected privileged RPCs were also checked: `get_malachite_push_secrets` and `verify_malachite_ai_worker_signature` are executable by `service_role` (and postgres), not by `authenticated`; `malachite_ai_manager_is_admin` and `moderate_user` are executable by authenticated users but are designed to enforce the caller's admin allow-list internally. This is an ACL snapshot, not a substitute for negative authorization tests.



## Account-deletion dependency inventory (production read-only, 25 November 2026)

A catalog query inspected foreign keys referencing `auth.users` or `public.profiles`, plus likely user-identity columns in `public` and `private`. This is a schema inventory, not a deletion rehearsal.

### Important existing cascade behavior

The production schema currently has `ON DELETE CASCADE` paths for identity/profile rows and multiple user-linked records, including:
- `profiles`, `prives`, `login_names`, `statuts`, `suspensions`
- `messages` is not in the returned FK list, but `message_receipts` cascades on either sender or recipient deletion
- `call_sessions` cascades on caller or callee deletion
- `blocages`, `malachite_referrals`, `demandes_support.user_id`, `admin_push_subscriptions`
- internal `private.admins` and `private.match_daily_like_events`

Audit-oriented columns that use `ON DELETE SET NULL` include `admin_actions.admin_id`, `campagnes.cree_par`, `demandes_support.traite_par`, `signalements.traite_par`, and `user_notifications.related_user_id`.

### User references without a declared FK

The schema also contains user-shaped columns that did not appear in the FK inventory, including:
- `messages.de` and `messages.a`
- `paiements.user_id`
- `rendez_vous.de` and `rendez_vous.a`
- `signalements.de`
- `avis_match.user_id`, `avis_site.user_id`, `deblocages.user_id`
- `ai_manager_audit.admin_id`
- `private.founder_finance_ledger` has a `reference_code` and `country_code` but the inspected name-pattern query did not establish a user ownership field there.

The exact absence of a foreign key does not prove that a field is unused or safe to erase. Application logic, JSON payloads, Storage paths, audit rows and external payment references may still depend on it.

### Deletion design consequence

A direct `auth.admin.deleteUser` would cascade-delete some records while leaving other rows that may retain the UUID, personal content, payment history or legal evidence. It could also erase both sides of a shared receipt/call record because either participant is a cascade parent. No deletion was attempted.

Before implementation, define per-table treatment (erase, anonymize, retain with access restriction, or preserve as legally required), especially for `messages`, `paiements`, `signalements`, `avis_*`, `rendez_vous`, support and moderation audit records. The deletion worker must explicitly handle shared records and media references before deleting the Auth identity last. This remains blocked on approved retention rules and a synthetic-data rehearsal.



## Final branch/production synchronization check (25 November 2026)

- Production `supabase_migrations.schema_migrations` currently reports latest version `20261124122733`.
- The PR branch contains later security migrations dated 17:00–27:00 on 24 November; they are not recorded as applied in production. This is consistent with the read-only deployment boundary and explains why production still shows the older table ACLs and policies. It is not evidence that the branch migrations failed.
- The current PR head is `e2703f2a04c581f88e7a681ebed57b910d328ea8`. On that exact SHA, GitHub reports `Malachite validation` successful with 14/14 jobs and `Match isolated PostgreSQL runtime` successful.
- PR #122 remains open, draft, unmerged, and GitHub reports `mergeable_state=clean`. No deployment or migration was executed.



### ACL interpretation clarification

A first inventory using `information_schema.role_column_grants` showed effective column-level access rows for several tables. A follow-up inspection of `pg_class.relacl` and `pg_attribute.attacl` clarified that the broad INSERT/UPDATE/DELETE rights on `paiements`, `call_sessions`, `config`, `login_names`, `prives` and `statuts` are still present as **old table-level ACLs in production**, not independent per-column grants. The production `profiles` table has explicit per-column SELECT ACLs; the broad old INSERT/UPDATE rights are table-level.

This is consistent with the production migration ledger ending at `20261124122733`: the PR's later revocation migrations have not yet been applied. The branch's post-migration CI assertions check the restricted table privileges and the negative write paths. No production permission was changed. This clarification supersedes any interpretation of the initial role-column-grant listing as proof of surviving per-column write grants.


## Effective authenticated ACL and call-status RPC follow-up (25 November 2026)

This follow-up was implemented on the security PR branch only; production remains read-only.

- Migration `20261125141500_normalize_authenticated_table_acl.sql` revokes existing authenticated table-level privileges and enumerated column-level privileges from `call_sessions`, `config`, `login_names`, `paiements`, `statuts`, and `prives`, then restores only the required SELECT access to call history, login-name lookup, payment history, entitlement status, and owner-scoped private profile data.
- `config` remains inaccessible to client roles because it contains payment destinations and payment intake is paused. No direct INSERT privilege is restored on `paiements`; its intake remains disabled. Direct INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges remain revoked from authenticated on the targeted tables.
- Call-session status transitions now use `public.update_my_call_session_status(uuid,text)`, a SECURITY DEFINER RPC with an empty search_path, explicit `auth.uid()` validation, participant ownership checks, and allowed-state checks. The client no longer performs direct `call_sessions` UPDATE statements; direct table UPDATE is revoked.
- The disposable ACL fixture deliberately seeds broad table-level and column-level grants before applying the migration. The assertions check effective PostgreSQL privileges, confirm payment intake and config access stay closed, and exercise authorized/unauthorized call status transitions plus a denied direct UPDATE.
- On code commit `d69a7e18f17a32307bcb6a3e03e3da9deb3b6baf`, the new `effective-authenticated-acl` job and all 16 validation jobs passed; both `Malachite validation` and `Match isolated PostgreSQL runtime` workflows completed successfully.
- The production migration ledger and permissions were not changed. These branch corrections are not active in production until the separate coordinated deployment is approved and executed.


## Final paused-call RPC exposure review (25 November 2026)

A follow-up review found that revoking direct table writes did not by itself pause SECURITY DEFINER call RPCs: the historical `start_call_session` function retained EXECUTE for `authenticated`, and the newly introduced status RPC had initially been granted EXECUTE as well. This could bypass the intended client-side feature flag and table ACL pause.

The ACL normalization migration has been tightened to:
- revoke effective table and column ACLs from `PUBLIC`, `anon`, and `authenticated` on the targeted tables before restoring only authenticated SELECT on the permitted tables;
- keep `config` hidden and payment intake closed;
- revoke EXECUTE on both `start_call_session` and `update_my_call_session_status` from client roles while calls remain paused.

The disposable PostgreSQL fixture now seeds a legacy authenticated EXECUTE grant for `start_call_session`. The checks assert that neither anon nor authenticated can read the restricted tables through inherited PUBLIC grants, perform direct writes, or execute either call RPC during the pause. Production remains unchanged.


## ACL inherited column-grant correction (25 November 2026, 17:10 UTC)

A further review of `20261125141500_normalize_authenticated_table_acl.sql` found that its first implementation enumerated column grants for `PUBLIC`, `anon`, and `authenticated`, but only revoked them from `authenticated`. This could leave column-level rights inherited from `PUBLIC` or granted directly to `anon`.

The migration now revokes each enumerated column privilege from its actual grantee, handling PostgreSQL's special `PUBLIC` keyword separately from quoted role identifiers. The disposable ACL fixture now deliberately seeds column-level INSERT/UPDATE grants for `PUBLIC` and `anon` as well as the legacy authenticated grants. The existing assertions verify that anonymous clients inherit no column write privileges after the migration.

Validation on updated PR #122 head `768da87c91648dcac099e06fd0b601629ab276ef`: all 15 Malachite validation jobs and the isolated Match PostgreSQL runtime job passed. A separate production transaction tested the dynamic revoke syntax against disposable test tables and was rolled back; no production ACL or application data was changed.

This correction remains on the PR branch and is not deployed to production.
