-- Effective ACL assertions after the migration; this intentionally tests
-- PostgreSQL privileges, not RLS policy definitions.
do $$
declare
  t text;
  c record;
  v_table text;
  v_expected boolean;
begin
  foreach t in array array[
    'call_sessions','config','login_names','paiements','statuts','prives'
  ] loop
    v_table := format('public.%I', t);
    if not has_table_privilege('authenticated', v_table, 'SELECT') then
      raise exception 'authenticated_select_missing:%', t;
    end if;

    foreach v_table in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      v_expected := (t = 'paiements' and v_table = 'INSERT');
      if has_table_privilege('authenticated', format('public.%I',t), v_table) <> v_expected then
        raise exception 'unexpected_table_acl:%:%', t, v_table;
      end if;
    end loop;

    for c in
      select column_name from information_schema.columns
      where table_schema='public' and table_name=t
    loop
      if has_column_privilege('authenticated',format('public.%I',t),c.column_name,'INSERT')
         and not (t='paiements') then
        raise exception 'unexpected_column_insert:%:%',t,c.column_name;
      end if;
      if has_column_privilege('authenticated',format('public.%I',t),c.column_name,'UPDATE')
         and not (t='call_sessions' and c.column_name='status') then
        raise exception 'unexpected_column_update:%:%',t,c.column_name;
      end if;
    end loop;
  end loop;

  if not has_column_privilege('authenticated','public.call_sessions','status','UPDATE')
     or has_column_privilege('authenticated','public.call_sessions','expires_at','UPDATE')
     or has_column_privilege('authenticated','public.call_sessions','caller_id','UPDATE')
     or has_column_privilege('authenticated','public.call_sessions','callee_id','UPDATE') then
    raise exception 'call_session_column_acl_not_narrowed';
  end if;
  if not has_table_privilege('authenticated','public.paiements','INSERT') then
    raise exception 'payment_submission_insert_must_remain_available';
  end if;
end
$$;
