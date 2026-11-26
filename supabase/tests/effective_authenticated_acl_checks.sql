-- Effective PostgreSQL ACL assertions. RLS definitions alone are not enough.
-- Calls and payment intake are deliberately paused until activation is audited.
do $$
declare
  t text;
  c record;
  v_priv text;
begin
  foreach t in array array[
    'call_sessions','config','login_names','paiements','statuts','prives'
  ] loop
    if t='config' then
      if has_table_privilege('authenticated',format('public.%I',t),'SELECT') then
        raise exception 'payment_destination_config_must_remain_hidden';
      end if;
    elsif not has_table_privilege('authenticated',format('public.%I',t),'SELECT') then
      raise exception 'authenticated_select_missing:%',t;
    end if;

    -- Anonymous clients must not inherit even SELECT via PUBLIC.
    if has_table_privilege('anon',format('public.%I',t),'SELECT') then
      raise exception 'anon_table_access_not_revoked:%',t;
    end if;

    foreach v_priv in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('authenticated',format('public.%I',t),v_priv) then
        raise exception 'unexpected_authenticated_table_acl:%:%',t,v_priv;
      end if;
      if has_table_privilege('anon',format('public.%I',t),v_priv) then
        raise exception 'unexpected_anon_table_acl:%:%',t,v_priv;
      end if;
    end loop;

    for c in
      select column_name from information_schema.columns
      where table_schema='public' and table_name=t
    loop
      if has_column_privilege('authenticated',format('public.%I',t),c.column_name,'INSERT')
         or has_column_privilege('authenticated',format('public.%I',t),c.column_name,'UPDATE')
         or has_column_privilege('anon',format('public.%I',t),c.column_name,'INSERT')
         or has_column_privilege('anon',format('public.%I',t),c.column_name,'UPDATE') then
        raise exception 'unexpected_column_write_acl:%:%',t,c.column_name;
      end if;
    end loop;
  end loop;

  if has_function_privilege('authenticated','public.update_my_call_session_status(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.update_my_call_session_status(uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.start_call_session(uuid,uuid,text,text,timestamptz)','EXECUTE')
     or has_function_privilege('anon','public.start_call_session(uuid,uuid,text,text,timestamptz)','EXECUTE') then
    raise exception 'paused_call_rpc_must_not_be_executable_by_client_roles';
  end if;
end
$$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true);

-- Even a participant cannot mutate a session directly while calls are paused.
do $$
begin
  begin
    update public.call_sessions set status='accepted'
    where id='70000000-0000-0000-0000-000000000001';
    raise exception 'direct_call_session_update_was_allowed';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;
rollback;
