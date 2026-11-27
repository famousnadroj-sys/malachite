do $message_acl$
begin
  if has_table_privilege('authenticated','public.messages','update') then
    raise exception 'authenticated_message_update_must_be_revoked';
  end if;
  if has_table_privilege('authenticated','public.messages','delete') then
    raise exception 'authenticated_message_delete_must_be_revoked';
  end if;
  if not has_table_privilege('authenticated','public.messages','select') then
    raise exception 'authenticated_message_select_missing';
  end if;
  if not has_table_privilege('authenticated','public.messages','insert') then
    raise exception 'authenticated_message_insert_missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages'
      and policyname='lire ses messages' and cmd='SELECT'
  ) then raise exception 'message_read_policy_missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages'
      and policyname='envoyer un message' and cmd='INSERT'
  ) then raise exception 'message_insert_policy_missing'; end if;
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages'
      and cmd in ('UPDATE','DELETE','ALL')
  ) then raise exception 'unexpected_message_mutation_policy'; end if;
end
$message_acl$;
