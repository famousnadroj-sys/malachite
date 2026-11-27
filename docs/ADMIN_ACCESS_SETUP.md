# Malachite — administrator access setup

The candidate migration `20261126270000_reconcile_admin_audit_and_allowlist_from_live.sql` recreates the verified administrator allowlist and audit table. It intentionally does **not** seed an administrator UUID or email into source control.

After the founder/admin has registered and the Auth account is confirmed:

1. In Supabase Dashboard → Authentication → Users, copy the exact Auth user UUID for the intended administrator.
2. In SQL Editor, insert that UUID into the private allowlist:

```sql
insert into private.admins(user_id)
values ('<CONFIRMED_AUTH_USER_UUID>')
on conflict (user_id) do nothing;
```

3. Verify only the expected administrator is allowlisted:

```sql
select count(*) from private.admins;
```

Do not select or publish the UUID in logs, screenshots, source code, or chat. Keep the allowlist table inaccessible to browser roles; Admin pages rely on `private.is_admin()` and the `admin_actions` RLS policy.

The migration preserves audit rows when an admin account is deleted: `admin_actions.admin_id` becomes NULL and the allowlist row cascades away. It does not create or grant a browser write path for audit records; privileged server functions write them.
