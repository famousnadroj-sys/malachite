do $$
begin
  if has_function_privilege('anon', 'public.founder_finance_summary(timestamptz,timestamptz)', 'EXECUTE') then
    raise exception 'anon must not execute founder finance summary';
  end if;
  if has_function_privilege('authenticated', 'public.founder_finance_summary(timestamptz,timestamptz)', 'EXECUTE') then
    raise exception 'authenticated must not execute founder finance summary';
  end if;
  if not has_function_privilege('service_role', 'public.founder_finance_summary(timestamptz,timestamptz)', 'EXECUTE') then
    raise exception 'service_role must retain founder finance summary execution';
  end if;
end
$$;
