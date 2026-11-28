# Malachite — live SECURITY DEFINER / advisor recheck (27 Nov 2026)

Read-only recheck of production `tscsmemsvgacqioncash` and staging `sbawknyxcjslvhknomkd`.

## Production advisor snapshot

Observed at 2026-11-27 12:32 UTC:
- 12 RLS-enabled tables without policies (INFO). These include admin, private finance, AI queues/settings, referrals, push queues, and retired campaign surfaces. No generic policies should be added; verify each is intentionally inaccessible to client roles.
- 1 anon SECURITY DEFINER warning: `public.get_malachite_referrer_preview(uuid)`. Production still requires the candidate privacy correction to exclude blocked/suspended profiles.
- 9 authenticated SECURITY DEFINER warnings. Review wrappers against their private implementation and explicit execute grants; the warning alone does not establish an authorization bypass.
- Leaked-password protection remains disabled.

## Staging advisor snapshot

Observed at 2026-11-27 12:32 UTC:
- 13 RLS-enabled tables without policies (INFO), including private/admin/AI tables and `public.config`, `public.login_names`, `public.malachite_referrals`. These remain fail-closed; do not add permissive policies to silence the advisor.
- `pg_net` version 0.20.4 is installed in `public` (WARN). No relocation was performed. Before moving it, verify all scheduled `net.http_*` calls and extension dependencies, then prepare a tested migration; changing schema blindly may break scheduled jobs.
- 1 anon SECURITY DEFINER warning for referral preview and 26 authenticated warnings. The staging function bodies were checked for representative admin/finance and member wrappers.

## Function-body review in staging

Confirmed:
- Admin referral/finance functions explicitly require an authenticated user and `private.is_admin()`.
- Payment review implementation checks `private.is_admin()`, locks pending payment rows, validates offer/target, requires a rejection reason, and writes an admin audit row.
- `admin_duplicate_pending_payment_ids` includes `private.is_admin()` in its query predicate.
- Moderation delegates to `private.admin_moderate_user`, which checks authenticated admin, forbids self-targeting, and prevents moderation of another admin.
- Member wrappers delegate to private functions that scope data/actions to `auth.uid()` or require authentication; e.g. contact disclosure requires a mutual Match, no block, and entitlement; notification creation writes only for the current user.
- Reviewed SECURITY DEFINER definitions use `search_path = ''`.

## Scope and remaining work

This is a source/permission review, not an adversarial end-to-end test of every wrapper. Candidate CI remains the place for exhaustive allowlist and negative authorization tests. Production and staging advisor results differ because staging has additional candidate functions/tables; do not treat staging counts as production counts.

No SQL, extension, policy, secret, cron, or production setting was changed.
