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
6. Enable leaked-password protection in Supabase Auth and verify the setting.
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
