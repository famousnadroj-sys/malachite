# MALACHITE — Supabase advisor review (2026-11-24)

Read-only review of the production Supabase Security, Health, and Performance advisors. No database or Auth settings were changed.

## Summary

- Health advisor: no findings.
- Security advisor: informational RLS findings, SECURITY DEFINER warnings, and leaked-password protection disabled.
- Performance advisor: unused-index notices only; no index was removed.

## Findings and disposition

### RLS enabled without policies (12 informational findings)

The advisor reported tables with RLS enabled and no policies, including private admin/finance/match tables, admin push queues, AI audit/operations tables, and the retired campaign table.

No-policy RLS is default-deny for API roles. This is expected for tables accessed only through trusted server/service-role paths or intentionally retired tables. Do not add broad policies merely to silence the advisor. Verify each table's intended access path when its feature is activated.

### SECURITY DEFINER functions (1 anonymous, 9 authenticated warnings)

Read-only inspection of function definitions found:

- `admin_malachite_referrals`, `founder_business_overview`, and `founder_finance_summary` explicitly require an authenticated admin through `private.is_admin()`.
- `start_call_session` requires an authenticated caller and validates entitlement, mutual match, blocks, expiry, and active-call constraints.
- `est_match`, `match_like_quota`, `match_received_likes`, and `match_relation_compatible_ids` delegate to private functions that require `auth.uid()` and scope results to the caller, with public/private profile, block, and suspension filters.
- `get_malachite_referrer_preview` is intentionally callable anonymously for referral previews, and returns only `prenom` and `username` for profiles not marked private.

These are not automatically vulnerabilities merely because they use SECURITY DEFINER. Keep them under review and test unauthorized calls, especially before adding new fields or widening returned data.

### Leaked-password protection disabled (warning)

Supabase Auth's compromised-password protection is disabled. This is a valid security hardening item. It was not changed because the available project connection does not expose Auth configuration controls; enable it through the Supabase Auth dashboard when the account owner can review the setting and its effect on password sign-in.

### Unused indexes (19 informational findings)

Do not drop these based only on an early/low-traffic usage snapshot. Reassess after meaningful production traffic and a reviewed query-plan exercise. No index was removed.

## Related verified launch state

- Campaign table contains 0 rows and 0 active campaigns.
- Both legacy campaign buckets are private and contain 0 objects.
- Deployed `malachite-ad-creative` Edge Function is ACTIVE but returns HTTP 410 `advertising_generation_disabled`; ad generation is disabled.
- Public campaign read policies are absent.
- Public website deployment after the latest documentation merge completed successfully.

## Remaining launch blockers

1. Actual Jitsi room participant authentication; current browser client does not pass a Jitsi JWT.
2. Review/enable leaked-password protection in Supabase Auth settings.
3. Account deletion remains a design and test task; do not delete production accounts until retention/legal review and synthetic-user tests pass.
4. Verify the campaign-storage retirement migration is represented consistently in the repository migration history before future schema resets.

This document records a point-in-time audit, not a security certification.
