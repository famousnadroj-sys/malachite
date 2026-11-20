-- Restrict payment review RPCs to signed-in sessions.
-- The private implementation independently enforces the administrator allow-list.
begin;

revoke all on function public.traiter_paiement(bigint, boolean) from public, anon;
revoke all on function public.traiter_paiement(bigint, boolean, text) from public, anon;

grant execute on function public.traiter_paiement(bigint, boolean) to authenticated;
grant execute on function public.traiter_paiement(bigint, boolean, text) to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.traiter_paiement(bigint, boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.traiter_paiement(bigint, boolean, text)', 'EXECUTE') then
    raise exception 'payment_review_rpc_must_not_be_executable_by_anon';
  end if;
  if not has_function_privilege('authenticated', 'public.traiter_paiement(bigint, boolean)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.traiter_paiement(bigint, boolean, text)', 'EXECUTE') then
    raise exception 'authenticated_payment_review_rpc_grant_missing';
  end if;
end
$$;

commit;
