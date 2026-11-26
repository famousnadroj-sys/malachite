do $$
begin
  if has_table_privilege('authenticated','public.deblocages','SELECT')
     or has_table_privilege('authenticated','public.deblocages','INSERT')
     or has_table_privilege('authenticated','public.deblocages','UPDATE')
     or has_table_privilege('authenticated','public.deblocages','DELETE')
     or has_table_privilege('anon','public.deblocages','SELECT')
     or has_table_privilege('anon','public.deblocages','INSERT') then
    raise exception 'legacy_contact_unlock_table_must_not_be_directly_accessible';
  end if;
  if position('public.deblocages' in pg_get_functiondef('private.contact_de(uuid)'::regprocedure))=0 then
    raise exception 'guarded_contact_rpc_must_preserve_legacy_entitlements';
  end if;
end
$$;
