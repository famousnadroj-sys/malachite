# Malachite — production backup and isolated restore gate

This runbook is required before any production security migration or provider activation. It does not authorize a production change.

## 1. Freeze and record the source

- Pause schema changes and deployments.
- Record the production project ref, current migration ledger, deployed Edge Function versions, and the exact Git commit to be tested.
- Do not put database passwords, service-role keys, JaaS private keys, or Auth tokens in Git, logs, issue comments, or workflow artifacts.

## 2. Back up every data plane

A PostgreSQL dump alone is **not** a complete Malachite backup.

1. Database: take a provider-managed backup/PITR restore point if available, then export a custom-format PostgreSQL dump using the production database connection string and `pg_dump --format=custom --no-owner --no-privileges`. Include application schemas and verify the dump can be listed with `pg_restore --list`.
2. Auth: export all Auth users through the Supabase Admin API, including IDs, email/phone, user/app metadata, confirmation and ban state. Treat this export as highly sensitive; never export password hashes unless the provider's supported backup mechanism explicitly includes them.
3. Storage: enumerate every bucket and object; download every object byte-for-byte, preserving bucket, object path, content type, size, and metadata. A database dump does not contain the object bytes.
4. Configuration: record Auth settings, redirect URLs, RLS/Storage policies, Edge Function names and deployed versions, secrets **names** (not values), scheduled jobs, webhooks, and DNS/Pages configuration.
5. Source: archive the exact main/app candidate commit and migration files.

## 3. Verify backup integrity

- Compute SHA-256 checksums for each dump/archive and the object manifest.
- Confirm all object downloads match recorded byte sizes and hashes.
- Confirm the Auth export count matches the source Auth user count.
- Store the backup encrypted, access-restricted, and outside the public repository. Keep a second copy in a separate secure location.

## 4. Restore to an isolated project

- Restore the database dump to a disposable Supabase project; restore Auth users through supported Admin APIs and upload Storage objects to matching private/public buckets.
- Apply only the reviewed migration sequence to the restored copy.
- Compare row counts for profiles, private profiles, login names, messages, receipts/payments, entitlements, call sessions, notifications, and moderation records.
- Verify RLS and Storage policies as `anon`, ordinary `authenticated`, owner, recipient/participant, and admin roles.
- Test account login, profile creation/edit/private visibility, messaging/media, payment submission and admin review, notifications, matching, call creation/accept/expiry, and account deletion.
- Confirm rollback restores the exact pre-migration schema, data, Auth accounts, and Storage bytes.

## 5. Production gate

Do not run production migrations until the restore test is documented as successful and the owner has explicitly approved the exact migration list and change window. If any plane (database, Auth, Storage, configuration) is missing or unverified, the backup gate remains **NO-GO**.

## Current limitation

The connected Supabase operations available in this workflow can inspect projects, migrations, SQL, and Edge Functions, but do not provide a complete one-click export of production PostgreSQL + Auth + Storage bytes. Therefore a complete backup/restore has not been claimed or performed.
