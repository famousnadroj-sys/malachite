# Production / staging ACL recheck — 28 Nov 2026

Read-only live evidence for PR #158. No production or staging mutation was performed for this check.

## Effective table-level grants

Query used on both projects:

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('authenticated','anon')
  and table_name in (
    'profiles','call_sessions','messages','paiements',
    'statuts','prives','login_names'
  )
order by table_name,grantee,privilege_type;
```

### Production: `tscsmemsvgacqioncash`

The authenticated role still has table-level:
- `profiles`: INSERT, UPDATE, DELETE (table-level SELECT absent in this query; column grants may separately exist).
- `call_sessions`: SELECT, INSERT, UPDATE, DELETE.
- `messages`: SELECT, INSERT, UPDATE, DELETE.
- `paiements`: SELECT, INSERT, UPDATE, DELETE.
- `prives`: SELECT, INSERT, UPDATE, DELETE.
- `login_names`: SELECT, INSERT, UPDATE, DELETE.
- `statuts`: SELECT, INSERT, UPDATE, DELETE.

This confirms broad client DML privileges remain in production even where RLS currently narrows row access. RLS is not a substitute for least-privilege table grants.

### Staging: `sbawknyxcjslvhknomkd`

For the same tables, authenticated has only:
- SELECT on `profiles`, `call_sessions`, `messages`, `paiements`, `statuts`, `prives`, `login_names`.
- INSERT on `messages` for the message creation contract.
- No table-level INSERT/UPDATE/DELETE on `profiles`, `call_sessions`, `paiements`, `statuts`, `prives`, or `login_names`.

Column-level grants and RPC execution are separate and must be checked against the application contract; the above is not a complete ACL inventory.

## Supabase Security Advisor snapshot

Observed at 2026-11-28 03:55 UTC:
- Production: 12 RLS-enabled tables without policies (INFO), one anon-executable SECURITY DEFINER referrer preview, nine authenticated-executable SECURITY DEFINER RPCs, and leaked-password protection disabled on the current plan.
- Staging: 15 RLS-enabled tables without policies (INFO), `pg_net` in `public` (WARN), one anon-executable referrer preview, and 27 authenticated-executable SECURITY DEFINER RPCs.

No blanket revocation of SECURITY DEFINER EXECUTE is recommended: each RPC must be checked against its caller and authorization logic. Tables with RLS enabled but no policies must be evaluated alongside grants; private/admin tables with no client grants are not automatically exposed.

## Required next gates

1. Obtain an encrypted, off-site complete backup of database, Auth recovery material, and all Storage object bytes.
2. Prove a full isolated restore and record checksums.
3. Reconcile the independent production/staging migration ledgers from a restored production baseline; do not replay staging's schema-only baseline into production.
4. Prepare and test one forward-only production ACL/privacy cutover against that restored copy.
5. Require owner approval and a maintenance window before production apply.
6. After apply, re-query effective table/column/function grants and run negative authorization tests.

## Decision

Production remains unchanged. These live findings reinforce the existing **NO-GO** launch gate; this document is evidence, not a production remediation.
