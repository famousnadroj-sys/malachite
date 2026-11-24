# MALACHITE — authenticated call deployment plan

## Verified current implementation

- The browser loads `https://meet.jit.si/external_api.js`.
- It creates `JitsiMeetExternalAPI('meet.jit.si', { roomName, ... })`.
- The client does not pass a Jitsi JWT.
- The database RPC `start_call_session` checks application eligibility, including call pass/Premium state, reciprocal match, blocks, and expiry. This protects the MALACHITE call-session record, but it does not authenticate users to the actual Jitsi room.
- A room name that is difficult to guess is not equivalent to authenticated room access.

## Required target architecture

1. Choose a Jitsi deployment that MALACHITE controls and supports token authentication. Do not assume public `meet.jit.si` accepts MALACHITE-generated JWTs.
2. Keep signing credentials only in server-side secrets. Never put the signing secret in browser code, repository files, or client configuration.
3. After existing `start_call_session` eligibility checks succeed, have a trusted server endpoint issue a short-lived token for that specific user and room.
4. Restrict token claims to the deployment's configured issuer/audience, exact room, authenticated user identity, and short validity window. Use the deployment's documented claim format and validate it in staging.
5. Require both participants to receive their own token; never share a caller's token with the callee.
6. Keep room names server-generated, opaque, and tied to the call-session record. Re-check call status and expiry before issuing a token.
7. Add abuse controls: token rate limits, short expiry, room scope restrictions supported by the deployment, and audit events that never log tokens.
8. Test with two separate devices/accounts: authorized participants join; a third account, anonymous browser, expired token, wrong-room token, and ended call are denied.
9. Only after staging evidence exists should the deployment be considered for launch. Preserve the existing public call path until a tested replacement is ready; do not silently disable live calls.

## Cost and approval boundary

Self-hosting requires infrastructure, maintenance, updates, bandwidth, and monitoring. This document does not select a paid provider, create a server, activate billing, or change production calls. Compare realistic monthly cost and capacity before choosing deployment.

## Release gate

Calls are **not security-ready for launch** until the actual conference room enforces server-validated participant authentication and the negative tests above pass. Database authorization alone is insufficient.


## Database call-expiry guard — production status (24 November 2026)

### Code and isolated tests

- PR #100 merged the client-side acceptance-result check and the additive migration `20261124130100_reject_expired_call_acceptance.sql`.
- PR #101 expanded the disposable PostgreSQL fixture to include the existing `private.guard_call_session_update()` trigger, then verified:
  - expired `pending → accepted` is rejected with `call_session_expired`;
  - a non-expired call can transition `pending → accepted → ended`;
  - legitimate `pending → expired` and `pending → rejected` transitions remain available.
- PR #101 standard validation and PostgreSQL runtime checks passed before merge.

### Read-only production verification

A read-only inspection of Supabase production project `tscsmemsvgacqioncash` on 24 November 2026 found:

- `public.call_sessions.expires_at` is `NOT NULL` and defaults to 90 seconds after creation.
- The existing `guard_call_session_update` trigger is present.
- The new `reject_expired_call_acceptance` trigger is **not present**.
- The production migration history does not yet contain `20261124130100_reject_expired_call_acceptance`.
- At the time of the check, two rows were still `pending` despite their `expires_at` being in the past. No row values or user identifiers were copied into this report.

Therefore, the merged migration is tested in disposable PostgreSQL but the server-side expiry guard is **not yet active in production**. The client now checks the returned update row and expiry timestamp, but this is not a substitute for the database guard.

### Safe next steps

1. Before any production change, re-check the live trigger and migration history because the observed state can change.
2. Review the migration against the current production trigger and confirm the expected trigger order/behavior.
3. Obtain explicit production-change approval before applying the additive migration.
4. After application, verify the trigger definition and run a rollback-safe SQL check that an expired pending call cannot be accepted while valid terminal transitions remain permitted.
5. Decide separately whether stale pending rows should be marked expired. Do not mass-update call records as part of the trigger migration without a reviewed cleanup procedure.

This check does not authenticate users inside the Jitsi conference room. The Jitsi JWT/infrastructure release gate above remains unchanged.
