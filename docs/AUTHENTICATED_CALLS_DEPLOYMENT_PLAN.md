# MALACHITE — authenticated call deployment plan

## Verified current implementation

- The browser loads `https://meet.jit.si/external_api.js`.
- It creates `JitsiMeetExternalAPI('meet.jit.si', { roomName, ... })`.
- The client does not pass a Jitsi JWT.
- The database RPC `start_call_session` checks application eligibility, including the call pass/Premium state, reciprocal match, blocks, and expiry. This protects the MALACHITE call-session record, but it does not authenticate users to the actual Jitsi room.
- A room name that is difficult to guess is not equivalent to authenticated room access.

## Required target architecture

1. Choose a Jitsi deployment that MALACHITE controls and that supports token authentication. Do not assume the public `meet.jit.si` service will accept MALACHITE-generated JWTs.
2. Keep Jitsi signing credentials only in server-side secrets. Never put the signing secret in browser code, repository files, or client configuration.
3. After the existing `start_call_session` eligibility checks succeed, have a trusted server endpoint issue a short-lived token for that specific user and room.
4. Restrict token claims to the deployment's configured issuer/audience, exact room, authenticated user identity, and short validity window. Use the Jitsi deployment's documented claim format and validate it in a staging environment.
5. Require both participants to receive their own token; do not share a caller's token with the callee.
6. Keep room names server-generated, opaque, and tied to the call-session record. Re-check call status and expiry before issuing a token.
7. Add abuse controls: token rate limits, short expiry, replay/room scope restrictions supported by the deployment, and audit events that do not log tokens.
8. Test with two separate devices/accounts: authorized participants join; a third account, anonymous browser, expired token, wrong-room token, and ended call are denied.
9. Only after staging evidence exists should the deployment be considered for launch. Preserve the existing public call path until a tested replacement is ready; do not silently disable live calls.

## Cost and approval boundary

Self-hosting requires infrastructure, maintenance, updates, bandwidth, and operational monitoring. This document does not select a paid provider, create a server, activate billing, or change production calls. Compare realistic monthly cost and capacity before choosing deployment.

## Release gate

Calls are **not security-ready for launch** until the actual conference room enforces server-validated participant authentication and the negative tests above pass. Database authorization alone is insufficient.
