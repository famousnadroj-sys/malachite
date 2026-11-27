# Malachite — backup and restore evidence (26 November 2026)

## Verified account/project facts

- Supabase organization plan: `free`.
- Production project: `tscsmemsvgacqioncash`, region `eu-west-1`, PostgreSQL 17.12, status `ACTIVE_HEALTHY`.
- Supabase migration history currently ends at `20261124122733 account_deletion_fk_cleanup`.
- No downloadable daily backup inventory or restore receipt is exposed by the connected project tools. A successful SQL query or GitHub PostgreSQL fixture is not proof of a production backup or restore.

Supabase's current backup documentation says automatic daily backups are for Pro, Team and Enterprise plans. Free-plan projects should create logical backups with the Supabase CLI and keep an off-site copy. Storage objects are not included in database backups and must be copied separately.

Official references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Required logical export

Run from a trusted computer with Supabase CLI and Docker installed. Obtain the database connection string from Supabase Dashboard > Connect using the session pooler. Do not put the connection string, database password, access token or dump contents in GitHub or ChatGPT.

```sh
export SUPABASE_DB_URL='postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<SESSION_POOLER_HOST>:5432/postgres'

supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"

sha256sum roles.sql schema.sql data.sql > SHA256SUMS
```

Store the three dumps and checksum file encrypted outside the repository. Separately export every Storage bucket object and record object counts and checksums. The database dump contains Storage metadata, not the binary files themselves.

## Restore drill — isolated target only

1. Create a separate disposable Supabase project or isolated PostgreSQL 17/Supabase-compatible target. Never restore over production.
2. Restore roles, schema and data in that order using the official Supabase CLI/PSQL procedure.
3. Recreate required extensions and platform configuration; redeploy Edge Functions separately.
4. Transfer Storage objects and verify object counts/checksums.
5. Compare key table row counts, constraints, indexes, RLS policies, triggers, functions and migration history.
6. Test sign-in, profile visibility, messages, payments (without initiating real payments), admin permissions, and call denial.
7. Save timestamped restore logs, checksums and verification results. Only then mark the backup as restorable.

Example restore command (only on the isolated target):
```sh
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql --dbname "$ISOLATED_DATABASE_URL"
```

## Current result

<badge>NOT CERTIFIED</badge>

No production backup has been exported, no off-site copy is currently evidenced, and no restore drill has been completed. The current tools do not expose the production database password/connection string or downloadable backup inventory. Do not claim backup success or run a production restore. The remaining external prerequisite is a secure database connection string/password supplied through the user's trusted Supabase Dashboard/terminal workflow, not through chat.

## Important exclusions

- Do not commit dump files or secrets.
- Do not run destructive restore commands against the production project.
- Do not use the connected SQL tool to manually copy private member records as a substitute for a database backup.
- Do not treat the isolated CI PostgreSQL tests as a production restore test.


## Storage inventory — read-only snapshot

All six production buckets are currently private. Current object counts:
- `chat-media`: 31
- `malachite-campaign-media`: 0
- `malachite-campaigns`: 0
- `payment-receipts`: 2
- `photos`: 9
- `profile-photos`: 24

Total: 66 objects. These are inventory counts only, not an export. Before certification, export all six buckets (including currently empty buckets), then compare restored counts and per-object checksums. Keep receipts private and do not copy their contents into GitHub or chat.


## Core database baseline — read-only snapshot

- Database size: 23 MB
- `profiles`: 5 rows
- `paiements`: 8 rows
- `call_sessions`: 12 rows
- `messages`: 70 rows
- `avis_match`: 11 rows

These counts are a point-in-time restore comparison baseline, not a substitute for a full schema/data dump. Counts may legitimately change as members use the site; record a fresh snapshot at the time of the actual export.


## Recheck — 27 November 2026

This section is the current point-in-time snapshot and supersedes earlier row counts and bucket object counts above.

- Organization plan: `free`; production project remains `ACTIVE_HEALTHY`, PostgreSQL 17.12.
- Auth accounts: 10.
- Database size: approximately 24 MB.
- Storage buckets (all private): `chat-media` 31 objects / 64,526,647 bytes; `payment-receipts` 2 / 541,348 bytes; `photos` 9 / 1,159,211 bytes; `profile-photos` 24 / 4,114,676 bytes; `malachite-campaign-media` 0; `malachite-campaigns` 0. Total: 66 objects / 70,341,882 bytes.
- Supabase docs currently state automatic daily database backups are available on Pro, Team, and Enterprise plans. On Free, the owner must arrange regular logical exports and off-site copies.
- Supabase CLI `db dump` documentation says the CLI filters out managed `auth`, `storage`, and extension schemas. The CLI export is therefore not, by itself, a complete recovery set for Malachite's Auth accounts or Storage metadata/object bytes. Storage objects must be copied separately; Auth recovery must be proven through a supported full-project backup/restore route.
- Supabase docs currently state leaked-password protection is available on Pro and above. The production Auth advisor still reports this control disabled. No plan upgrade or Auth configuration change was made.
- No database dump, Auth export, Storage object export, off-site backup, or isolated restore has been completed in this work session. The backup gate remains **NOT CERTIFIED**.

The candidate runbook `docs/PRODUCTION_BACKUP_RESTORE_RUNBOOK.md` records the current bucket inventory, export requirements, and isolated restore checklist. Never treat SQL row counts or CI PostgreSQL fixtures as backup evidence.
