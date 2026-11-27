-- Atomic per-IP login throttling. A transaction-scoped advisory lock prevents
-- concurrent requests from racing past the attempt threshold.
create or replace function public.consume_username_login_attempt(
  p_ip_hash text,
  p_window_seconds integer default 900,
  p_max_attempts integer default 15
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$'
     or p_window_seconds < 1 or p_window_seconds > 3600
     or p_max_attempts < 1 or p_max_attempts > 100 then
    raise exception 'invalid login throttle parameters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_ip_hash, 0)
  );

  select count(*)::integer
    into v_recent_count
    from public.username_login_attempts
   where ip_hash = p_ip_hash
     and attempted_at >= pg_catalog.now()
       - pg_catalog.make_interval(secs => p_window_seconds);

  if v_recent_count >= p_max_attempts then
    return false;
  end if;

  insert into public.username_login_attempts (ip_hash)
  values (p_ip_hash);

  return true;
end;
$$;

revoke all on function public.consume_username_login_attempt(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text, integer, integer)
  to service_role;
