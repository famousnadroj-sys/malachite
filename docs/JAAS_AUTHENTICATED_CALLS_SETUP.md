# Malachite — JaaS authenticated calls setup

## Current state

Calls are intentionally disabled in the client and at the database boundary until the JaaS tenant, API key and private-key secret are configured and tested. Do not remove the fail-closed migration or re-enable the UI while using public `meet.jit.si` rooms.

The repository now contains a server-side token issuer at `supabase/functions/malachite-jaas-token/index.ts`. It:
- requires a valid Supabase user JWT;
- accepts only the Malachite GitHub Pages origin;
- looks up the requested call session using the service role;
- requires the caller to be one of the two participants and the session to be accepted and unexpired;
- sets the JWT `sub` to the AppID and the JWT `room` claim to the exact unprefixed room name; the browser receives the IFrame room name in `<AppID>/<room>` form, as required by 8x8; it also binds the authenticated user's ID;
- issues a short-lived RS256 JaaS JWT (120 seconds);
- fails closed when any provider secret is missing.

Deployment evidence (26 November 2026): version 1 of `malachite-jaas-token` is deployed to the isolated staging project `sbawknyxcjslvhknomkd` with platform JWT verification enabled. It is not deployed to production. No JaaS credentials have been configured in staging, so successful JWT signing and a real JaaS join have not been demonstrated. The JWT `room` claim is the exact session room (without the AppID prefix); the IFrame `roomName` is `<AppID>/<room>`. Do not merge these two formats.

## JaaS account and key prerequisites

1. Create or access a JaaS tenant in the official 8x8 Developer Console.
2. Create a 4096-bit RSA key pair. Keep the private key secret; upload only the public key to the JaaS API Keys page.
3. Use an unencrypted PKCS#8 private key PEM for the Edge Function secret. If the private key supplied by a tool is PKCS#1, convert it locally to PKCS#8 before storing it:
   ```sh
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in jaas-private-pkcs1.pem -out jaas-private-pkcs8.pem
   ```
4. Record the exact AppID (starts with `vpaas-magic-cookie-`) and API key ID suffix from the JaaS console.

Official references:
- https://developer.8x8.com/jaas/docs/api-keys-jwt/
- https://developer.8x8.com/jaas/docs/api-keys/
- https://developer.8x8.com/jaas/docs/iframe-api-integration/

## Required Edge Function secrets

Set these in the Supabase project's Edge Function secrets using a trusted local terminal or the Supabase dashboard:
- `JAAS_APP_ID`: full JaaS AppID, including `vpaas-magic-cookie-`.
- `JAAS_API_KEY_ID`: API key ID suffix shown in the JaaS console; the issuer builds `kid` as `AppID/keyId`.
- `JAAS_PRIVATE_KEY`: the unencrypted PKCS#8 PEM private key. Preserve PEM newlines or encode them as literal `\n`.

Never paste the private key into ChatGPT, GitHub issues, source files, commits, or ordinary logs. Never store it in repository secrets if the deployment workflow does not need it.

## Activation gate

Before any call is enabled:
1. Deploy the Edge Function with JWT verification enabled (the default). The staging deployment is complete; production deployment remains a release-gated step.
2. Configure the three secrets in Supabase.
3. Add a reviewed database migration that enables call creation only when the provider configuration is present and grants the required transition RPC only to authenticated users.
4. Update the client to call the token issuer and load `https://8x8.vc/<AppID>/external_api.js`, with `roomName: "<AppID>/<room>"` and the returned JWT. Never use `meet.jit.si`.
5. Test two different authenticated accounts, wrong participant, wrong session, pending/rejected/expired session, blocked and suspended members, expired JWT, and a room name from another call.
6. Confirm that the public Jitsi endpoint rejects users without a valid JWT and that each participant receives a token limited to the same exact room.
7. Only then remove the fail-closed UI state and re-enable calls.

The current Edge Function does not itself enable call creation, change call-session status, or activate any provider. Staging deployment only; no production function deployment or provider activation has been performed.


## Provider-gated call creation RPC — 27 Nov 2026

The candidate now includes `supabase/migrations/20261127140000_enable_call_creation_when_provider_configured.sql`. It restores the existing `start_call_session` RPC to authenticated users, but every request is rejected with `secure_call_provider_unavailable` while the private provider switch is OFF. Once enabled by the project owner after JaaS credentials and real join tests, the RPC validates:
- authenticated caller, both profiles, valid audio/video mode, a strict random room name, and a maximum 90-second pending window;
- Premium or an active seven-day call pass;
- reciprocal Match votes;
- both users not suspended and not blocked;
- no other unexpired pending/accepted call involving either participant;
- transaction advisory locks for both users, in stable order, to prevent simultaneous overlapping calls.

The migration has passed a dedicated PostgreSQL test job for disabled-provider rejection, valid creation when enabled, duplicate active call prevention, missing entitlement, block and suspension rejection. It has also been applied to the isolated staging project only. A live catalog recheck confirms provider remains disabled, authenticated EXECUTE is present, anon EXECUTE is absent, and the guard/concurrency locks are installed. No production migration or provider activation occurred.
