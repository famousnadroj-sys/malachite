begin;

set local role service_role;
do $$
begin
  if not public.consume_username_login_attempt(repeat('a',64),900,2) then
    raise exception 'first attempt should be allowed';
  end if;
  if not public.consume_username_login_attempt(repeat('a',64),900,2) then
    raise exception 'second attempt should be allowed';
  end if;
  if public.consume_username_login_attempt(repeat('a',64),900,2) then
    raise exception 'third attempt should be blocked';
  end if;
  if not public.consume_username_login_attempt(repeat('b',64),900,2) then
    raise exception 'separate IP should have an independent quota';
  end if;

  begin
    perform public.consume_username_login_attempt('not-a-sha256-hash',900,2);
    raise exception 'invalid_hash_should_be_rejected';
  exception when others then
    if sqlerrm='invalid_hash_should_be_rejected' then raise; end if;
    if sqlerrm<>'invalid login throttle parameters' then raise; end if;
  end;
end $$;
reset role;

do $$
begin
  if has_function_privilege('anon','public.consume_username_login_attempt(text,integer,integer)','EXECUTE')
     or has_function_privilege('authenticated','public.consume_username_login_attempt(text,integer,integer)','EXECUTE') then
    raise exception 'untrusted role can execute login throttle';
  end if;
  if not has_function_privilege('service_role','public.consume_username_login_attempt(text,integer,integer)','EXECUTE') then
    raise exception 'service_role cannot execute login throttle';
  end if;
end $$;

rollback;
