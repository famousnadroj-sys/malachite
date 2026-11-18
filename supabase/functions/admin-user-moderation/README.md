# Admin user moderation Edge Function

This function is the server-side boundary for account suspension. It must never be replaced by a browser-side service-role call.

## Required server environment

Supabase Edge Functions must provide these project environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret; never commit or expose it)

The function validates the caller's access token with Auth, then permits only the exact administrator email configured in `index.ts`. It refuses self-suspension and accepts only a UUID plus `suspend` or `unsuspend`.

## Deployment gate

The source is committed for review but is **not deployed**. Before deployment:

1. Confirm the administrator email is the account owner.
2. Confirm the Edge Function secret variables exist in Supabase Dashboard > Edge Functions > Secrets.
3. Deploy with JWT verification enabled (`verify_jwt = true`).
4. Test unauthenticated, non-admin, malformed UUID, self-suspension, valid suspension, and reactivation against test accounts.
5. Confirm the target cannot sign in while suspended and can sign in again after reactivation.

Do not put the service-role key in `index.html`, GitHub, a client bundle, or a chat message. Do not deploy until the secret configuration and test accounts are available.
