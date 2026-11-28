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


## Retired campaigns — additional live finding and candidate correction

A second read-only catalog query checked all RLS-enabled tables in `public` and `private` with no policies but API-role grants:
- Production returned one row: `public.campagnes`, RLS enabled, zero policies, authenticated has SELECT/INSERT/UPDATE/DELETE.
- Staging returned no such rows.
- Supabase Health Advisor returned no findings on either project.

The PR's prior campaign-policy reconciliation would have restored active campaign SELECT and admin CRUD, conflicting with the retired sponsored-campaign launch scope. The candidate migration `20261128011000_reconcile_campaigns_rls_policies.sql` was corrected to keep RLS enabled, drop legacy campaign policies, and revoke all browser-role table privileges. Its SQL check now asserts that campaign access remains closed. A staging transaction/rollback probe of that exact intended state passed; staging itself was not changed.

Performance Advisor reports unused-index INFO findings (18 production, 21 staging). No indexes were dropped: these are low-traffic/new environments and unused counters alone do not prove an index is safe to remove.


## Full table-level authenticated grant inventory

A second read-only query grouped all table-level grants to `authenticated` across `public`. This is the current production/staging comparison (column-level grants and function EXECUTE are separate):

- Production has 20 tables with table-level grants. Broad mutation sets remain on `avis_match`, `avis_site`, `call_sessions`, `campagnes`, `config`, `deblocages`, `demandes_support`, `login_names`, `messages`, `paiements`, `prives`, `profiles`, `rendez_vous`, `signalements`, `statuts`, and `user_notifications`.
- Staging has 20 tables with grants; most use SELECT-only or contract-limited INSERT/SELECT. Exceptions currently include `campagnes` (stale broad grants; the corrected candidate migration closes them) and `blocages` (INSERT/SELECT/DELETE as intended by the block/unblock contract).
- Production-only table grant surfaces absent from staging include `config` (full CRUD), `deblocages` (full CRUD), and `login_names` (full CRUD); production also has broader mutation privileges than staging on the profile, private profile, messages, payments, statuses, support, reviews, reports, appointments, notifications, and calls tables.

The candidate security cutover must reconcile this complete inventory with actual UI/RPC contracts, including the owner-approved payment intake decision. Do not blindly revoke all grants: retain only required column-level presence updates and narrowly authorized member inserts/updates; route sensitive profile, payment, call, and admin mutations through validated RPCs. Verify the final grant inventory after applying to a production-equivalent restore.


## Call provider and retired advertising function inventory

Read-only Edge Function inventory on 28 Nov 2026:
- Production has no `malachite-jaas-token` function deployed.
- Staging has `malachite-jaas-token` ACTIVE version 3 with platform JWT verification enabled. Provider remains disabled and no JaaS credentials/real two-account join were proven.
- Production `malachite-ad-creative` is ACTIVE version 6 with JWT verification enabled, but its current handler returns HTTP 410 `advertising_generation_disabled` for POST requests. This is disabled behavior, not evidence of live ad generation; retain the no-ad launch gate and remove/decommission only through a separately reviewed deployment change.

The public call surface remains a production blocker: do not publish the candidate client or enable calls until the JaaS issuer, provider config, participant tokens, and two-account tests are all complete.
