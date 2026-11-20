-- Remove SECURITY DEFINER from the public call-session RPC.
-- Authenticated users already have INSERT/SELECT grants and the table has
-- an ownership + entitlement + mutual-match INSERT policy. The function's
-- own checks remain defense in depth; RLS now also applies to its INSERT.
begin;

alter function public.start_call_session(uuid, uuid, text, text, timestamptz)
  security invoker;

do $$
declare
  v_definer boolean;
begin
  select p.prosecdef into v_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'start_call_session'
    and pg_get_function_identity_arguments(p.oid) =
      'p_id uuid, p_callee_id uuid, p_room text, p_mode text, p_expires_at timestamp with time zone';

  if v_definer is distinct from false then
    raise exception 'start_call_session_must_be_security_invoker';
  end if;

  if has_function_privilege('anon',
      'public.start_call_session(uuid, uuid, text, text, timestamptz)', 'EXECUTE') then
    raise exception 'anon_must_not_execute_start_call_session';
  end if;

  if not has_function_privilege('authenticated',
      'public.start_call_session(uuid, uuid, text, text, timestamptz)', 'EXECUTE') then
    raise exception 'authenticated_execute_grant_missing';
  end if;

  if not has_table_privilege('authenticated', 'public.call_sessions', 'INSERT') then
    raise exception 'authenticated_insert_grant_missing';
  end if;
end
$$;

commit;
