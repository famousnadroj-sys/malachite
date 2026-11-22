-- Private founder finance dashboard summary (staging-first).
-- Exposes only aggregate confirmed ledger figures to authenticated founders/admins.
create or replace function public.founder_finance_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  currency char(3),
  confirmed_events bigint,
  gross_amount numeric(18,2),
  fees_amount numeric(18,2),
  commissions_amount numeric(18,2),
  net_amount numeric(18,2)
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from >= p_to then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;
  return query
    select l.currency,
           count(*)::bigint,
           coalesce(sum(l.gross_amount),0)::numeric(18,2),
           coalesce(sum(l.fee_amount),0)::numeric(18,2),
           coalesce(sum(l.commission_amount),0)::numeric(18,2),
           coalesce(sum(l.net_amount),0)::numeric(18,2)
    from private.founder_finance_ledger l
    where l.status = 'confirmed'
      and (p_from is null or l.occurred_at >= p_from)
      and (p_to is null or l.occurred_at < p_to)
    group by l.currency
    order by l.currency;
end;
$function$;

revoke all on function public.founder_finance_summary(timestamptz,timestamptz) from public, anon;
grant execute on function public.founder_finance_summary(timestamptz,timestamptz) to authenticated;
