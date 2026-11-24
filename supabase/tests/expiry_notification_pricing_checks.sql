do $$
declare v_definition text;
begin
  select pg_get_functiondef('private.check_my_entitlement_expirations()'::regprocedure) into v_definition;
  if position('not_authenticated' in v_definition)=0 then
    raise exception 'entitlement_expiry_rpc_must_require_authentication';
  end if;
  if position('p.user_id=(select auth.uid())' in v_definition)=0 then
    raise exception 'entitlement_expiry_rpc_must_be_scoped_to_current_user';
  end if;
  if position('3 USD' in v_definition)>0 or position('2 USD' in v_definition)>0
     or position('0,50 USD' in v_definition)>0 or position('1 USD pour 7 jours' in v_definition)>0
     or position('30 jours' in v_definition)>0 or position('24 heures' in v_definition)>0 then
    raise exception 'expiry_notifications_must_not_hardcode_unapproved_prices_or_durations';
  end if;
  if not has_function_privilege('authenticated','public.check_my_entitlement_expirations()','EXECUTE')
     or has_function_privilege('anon','public.check_my_entitlement_expirations()','EXECUTE') then
    raise exception 'expiry_rpc_permissions_invalid';
  end if;
end
$$;
