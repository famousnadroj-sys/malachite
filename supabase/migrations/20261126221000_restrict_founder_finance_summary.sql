-- The legacy finance summary RPC is not used by the client.
-- Keep direct ledger summaries out of the PostgREST authenticated surface.
revoke all on function public.founder_finance_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.founder_finance_summary(timestamptz, timestamptz)
  to service_role;
