# Malachite — production backup and restore runbook

Status: **PREPARED, NOT EXECUTED**  
Production project: `tscsmemsvgacqioncash`  
Last inventory: 27 Nov 2026

## Why this is a launch gate

The Malachite Supabase organization is currently on the **Free** plan. Supabase's current documentation says automatic daily database backups are provided on Pro, Team, and Enterprise plans; Free projects should export data regularly and keep off-site copies. Leaked-password protection is also documented as available on Pro and above. Do not describe either feature as enabled on the current project.

Official references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/guides/storage/management/download-objects

## Current production footprint (read-only inventory)

- PostgreSQL 17.12; database size approximately 24 MB.
- Storage contains six private buckets:
  - `chat-media`: 31 objects, 64,526,647 bytes.
  - `payment-receipts`: 2 objects, 541,348 bytes.
  - `photos`: 9 objects, 1,159,211 bytes.
  - `profile-photos`: 24 objects, 4,114,676 bytes.
  - `malachite-campaign-media`: 0 objects.
  - `malachite-campaigns`: 0 objects.
- Total inventoried object data: 70,341,882 bytes (about 67.1 MiB). Object counts and sizes are a point-in-time snapshot; verify again immediately before backup.

## Required backup set

A recoverable backup must include all of the following, encrypted and stored outside the production project:

1. Database schema, data, and custom roles/privileges.
2. Supabase Auth account records and required Auth configuration (do not put password material in Git).
3. Storage object bytes from all six buckets, plus bucket/object metadata.
4. Edge Function source and environment-specific secret inventory (never export secret values into this repository).
5. A manifest containing timestamp, project ref, PostgreSQL version, bucket names, object counts/bytes, migration ledger, and SHA-256 checksums.

**Important limitation:** `supabase db dump` is a logical database export, not a full Supabase project backup. Current CLI documentation says it filters out Supabase-managed `auth`, `storage`, and extension schemas. It does not back up Storage object bytes. Do not label those SQL files a complete restore point.

## Logical database export

Run from a trusted workstation with the Supabase CLI and Docker installed. Obtain the production database connection string from the Supabase Dashboard's **Connect** panel. Do not paste it into chat, source control, or logs.

Set the connection string in a local environment variable named `SUPABASE_DB_URL`, then run:

```sh
umask 077
mkdir -p malachite-backup
cd malachite-backup

supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only

sha256sum roles.sql schema.sql data.sql > SHA256SUMS
```

These files are only the logical database portion. They do not satisfy the full-backup gate until Auth and Storage have also been backed up and independently verified.

## Storage export

Use Supabase Dashboard **Storage > Files** to download each bucket, or configure the S3-compatible Storage protocol and use an S3-compatible client such as rclone. Keep every bucket private in the backup. Preserve object paths exactly and compare exported file counts and byte totals with a fresh inventory.

Do not enable S3 protocol, create access keys, or store access credentials without the project owner's explicit approval.

## Restore verification

Restore only into a separate disposable Supabase project, never over production:

1. Restore the database portion using the documented Supabase restore procedure.
2. Restore Auth records/configuration using a supported full-project restore path; the logical CLI dump above is insufficient by itself.
3. Restore all six Storage buckets and verify object paths, counts, sizes, and checksums.
4. Redeploy Edge Functions and restore secrets from a separately secured secret manager.
5. Reconcile migration history against the restored schema.
6. Run the Malachite validation suite and negative privacy/authorization tests.
7. Verify sign-in, profile creation, private profile access, chat media, payment receipt visibility, and admin workflows using dedicated test accounts.

Record the restore duration and the amount of data lost between the backup timestamp and restore point. A backup is not considered verified until this full isolated restore passes.

## Current gate

- [ ] Complete database backup produced.
- [ ] Auth data/configuration recovery path proven.
- [ ] Storage objects from all six buckets exported and checksummed.
- [ ] Encrypted off-site copy exists.
- [ ] Full isolated restore passes.
- [ ] Recovery evidence and checksums recorded.

No production backup or restore has been executed by this work session. No project plan, billing, Auth setting, Storage configuration, or credentials were changed.


## Clarification from current Supabase documentation — 27 Nov 2026

The following distinctions are mandatory; do not treat a successful `supabase db dump` as a complete recovery artifact:

- Supabase's current **Restore to a new project / clone project** workflow is documented as a paid-plan feature and requires physical backups enabled on the source. It copies database schema/data/roles and Auth user records (including hashed passwords and Auth records), but does **not** copy Storage object bytes, Edge Functions, Auth settings/API keys, Realtime settings, integrations or all project settings. This cannot currently be assumed available to this Free-plan project.
- The standard CLI logical dump excludes Supabase-managed schemas such as `auth` and `storage`; it is useful for application schema/data but is not the Auth recovery artifact. A CSV export of `auth.users` is an inventory/export aid, not a complete Auth restore plan (identities, sessions, MFA, provider configuration and signing-key implications must be addressed).
- Supabase's documented Auth migration guidance supports migrating the Auth schema via a full dashboard `.backup` or SQL dump/import; signing keys differ between projects unless deliberately migrated, so existing sessions/tokens may need to be invalidated and users may need to sign in again. Do not copy signing secrets into this repository.
- Supabase's documented Storage transfer options include Dashboard downloads, CLI `supabase storage` copy commands, or S3-compatible access. Enabling S3 protocol and creating credentials is an owner-controlled security/configuration change and requires explicit approval.
- Supabase documents preserving `supabase_migrations` history separately when restoring/migrating a project. This is essential before comparing migration ledgers; never insert history rows to pretend migrations ran unless the restored schema has been independently verified.

### Recovery decision for the current Free project

Before claiming the backup gate is executable, the owner must confirm which supported artifact is actually available in the production Dashboard: a downloadable full database `.backup`, or only logical CLI dumps. If a full `.backup` is not available, obtain an approved, supported Auth-schema export/import procedure from Supabase documentation/support and test it on a disposable target before treating Auth recovery as solved. Do not create a paid project, enable S3, change plan/billing, create credentials, or restore over production without explicit owner approval.

### Current tool boundary

The connected Supabase actions available in this work session expose project metadata, migration ledgers, SQL execution, advisors, and branch operations; they do not expose a downloadable full database backup, Auth export, Storage object-byte export, or isolated restore verification. A Supabase development branch also starts without production data and may incur charges; it is not a substitute for a representative restore. Therefore no complete backup/restore can be honestly certified through the current connector alone.

Official references checked 27 Nov 2026:
- Database backups and plan limits: https://supabase.com/docs/guides/platform/backups
- Clone/restore to a new project and its omissions: https://supabase.com/docs/guides/platform/clone-project
- CLI backup/restore and migration-history preservation: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Auth user migration and signing-key considerations: https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects
- Storage object download/transfer: https://supabase.com/docs/guides/storage/management/download-objects

**No backup, export, restore, plan change, Storage setting, credential, or production mutation was performed by this work session.**
