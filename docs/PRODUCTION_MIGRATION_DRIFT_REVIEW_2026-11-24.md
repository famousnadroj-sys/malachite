# Production migration history reconciliation — 2026-11-24

## Scope

Read-only comparison of the Supabase project's recorded migration history against the SQL migration files currently committed in MALACHITE. No database migrations were applied during this review.

## Observed differences

The production migration history records:

- `20261124122025` — `retire_advertising_surfaces`
- `20261124122733` — `account_deletion_fk_cleanup`

The repository currently contains:

- `20261124120000_account_deletion_fk_cleanup.sql`
- `20261124130000_disable_public_campaign_storage.sql`
- `20261124150000_retire_advertising_surfaces.sql`

These names and versions do not line up one-to-one. In particular, production records the advertising retirement under a different timestamp than the repository file, and production does not list the separate `disable_public_campaign_storage` migration. The production retirement migration may have covered that same bucket/policy work, but migration history alone cannot prove file-content equivalence.

## Verified live state (read-only)

- Campaign table: 0 rows; 0 currently active campaigns.
- Deployed `malachite-ad-creative` Edge Function: ACTIVE with JWT verification enabled, version 6.
- Deployed function source returns HTTP 410 `advertising_generation_disabled` for POST requests. It currently disables both the creative and voiceover actions, not just ad creatives.
- Campaign storage was previously confirmed private with no objects; confirm again before any future storage changes.

## Safety instructions for future database work

1. Do not run `supabase db push`, reset, or bulk migration repair based on filenames alone.
2. Preserve the production migration history as evidence; do not delete or rewrite applied migration records.
3. Compare the SQL effects of the production-applied retirement migration with the repository files using a trusted migration artifact or exact SQL history.
4. If they are equivalent, create a documented reconciliation decision and ensure future fresh environments get the equivalent schema. Do not reapply duplicate DDL to production.
5. If they differ, write a new forward-only corrective migration with explicit guards and review it in isolation first.
6. Verify storage bucket flags and all campaign-related RLS policies in separate read-only queries before and after any approved migration.
7. Keep the separate account-deletion FK migration's actual production version aligned in documentation; do not assume the repository timestamp reflects the applied version.

## Conclusion

The live campaign feature is retired and empty, but migration filenames/history have drifted. The correct next step is a controlled reconciliation, not a blind migration push. This is an operational consistency issue, not proof that the production schema is currently broken.
