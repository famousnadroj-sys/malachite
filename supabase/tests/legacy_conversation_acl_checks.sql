do $legacy_acl$
declare
  v_table text;
begin
  foreach v_table in array array['conversation_members','conversation_pair_index','conversation_threads'] loop
    if has_table_privilege('authenticated','public.'||v_table,'insert')
       or has_table_privilege('authenticated','public.'||v_table,'update')
       or has_table_privilege('authenticated','public.'||v_table,'delete') then
      raise exception 'legacy_conversation_write_grant_remains_on_%',v_table;
    end if;
  end loop;
  if has_table_privilege('authenticated','public.demandes_support','delete') then
    raise exception 'support_request_delete_must_be_revoked';
  end if;
  if not has_table_privilege('authenticated','public.demandes_support','insert') then
    raise exception 'support_request_submit_grant_missing';
  end if;
end
$legacy_acl$;
