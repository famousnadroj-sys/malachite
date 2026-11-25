-- Normalize effective authenticated ACLs after the earlier targeted revokes.
-- Keep only the client operations still required by the existing UI:
-- SELECT on these tables, INSERT of a payment submission, and UPDATE(status)
-- on call sessions. All other direct table- and column-level grants are removed.
do $$
declare
  r record;
begin
  for r in
    select table_schema, table_name, column_name, privilege_type
    from information_schema.column_privileges
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = any (array[
        'call_sessions','config','login_names','paiements','statuts','prives'
      ])
  loop
    execute format(
      'revoke %s (%I) on table %I.%I from authenticated',
      r.privilege_type, r.column_name, r.table_schema, r.table_name
    );
  end loop;

  revoke all privileges on table
    public.call_sessions, public.config, public.login_names,
    public.paiements, public.statuts, public.prives
  from authenticated;

  grant select on table
    public.call_sessions, public.config, public.login_names,
    public.paiements, public.statuts, public.prives
  to authenticated;

  -- Payment records are user-submitted receipts; status/deletion remains a
  -- trusted server/admin operation.
  grant insert on table public.paiements to authenticated;

  -- Keep only the existing narrow participant status transition. Session
  -- identity, participants, and expiry remain server-controlled.
  grant update (status) on table public.call_sessions to authenticated;
end
$$;
