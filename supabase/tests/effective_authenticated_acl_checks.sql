-- Effective ACL assertions and call-status RPC behavior. This tests PostgreSQL
-- privileges directly; RLS policy definitions alone are not sufficient.
do $$
declare
  t text;
  c record;
  v_priv text;
  v_expected boolean;
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

    foreach v_priv in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      v_expected := false;
      if has_table_privilege('authenticated',format('public.%I',t),v_priv) <> v_expected then
        raise exception 'unexpected_table_acl:%:%',t,v_priv;
      end if;
    end loop;

    for c in
      select column_name from information_schema.columns
      where table_schema='public' and table_name=t
    loop
      if has_column_privilege('authenticated',format('public.%I',t),c.column_name,'UPDATE') then
        raise exception 'unexpected_column_update:%:%',t,c.column_name;
      end if;
      if has_column_privilege('authenticated',format('public.%I',t),c.column_name,'INSERT') then
        raise exception 'unexpected_column_insert:%:%',t,c.column_name;
      end if;
    end loop;
  end loop;

  if has_table_privilege('authenticated','public.paiements','INSERT') then
    raise exception 'payment_intake_must_remain_paused';
  end if;
  if not has_function_privilege('authenticated','public.update_my_call_session_status(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.update_my_call_session_status(uuid,text)','EXECUTE') then
    raise exception 'call_status_rpc_execute_grants_invalid';
  end if;
end
$$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true);
select (public.update_my_call_session_status(
  '70000000-0000-0000-0000-000000000001','accepted'
)).status;

-- A caller cannot accept on behalf of the callee.
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true);
do $$
begin
  begin
    perform public.update_my_call_session_status(
      '70000000-0000-0000-0000-000000000004','accepted'
    );
    raise exception 'caller_was_allowed_to_accept_call';
  exception when others then
    if sqlerrm='caller_was_allowed_to_accept_call' then raise; end if;
    if sqlerrm<>'call_transition_forbidden' then raise; end if;
  end;
end
$$;

-- Participant can end an accepted call through the RPC, not table UPDATE.
select (public.update_my_call_session_status(
  '70000000-0000-0000-0000-000000000001','ended'
)).status;

do $$
begin
  begin
    update public.call_sessions set status='rejected'
    where id='70000000-0000-0000-0000-000000000004';
    raise exception 'direct_call_session_update_was_allowed';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;
rollback;
