-- Founder-only aggregate overview for the private dashboard (staging first).
-- No user profile details, receipts, phone numbers, or payment references are returned.
create or replace function public.founder_business_overview(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from >= p_to then
    raise exception 'invalid_date_range' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'members', jsonb_build_object(
      'total', (select count(*) from public.profiles p
        where (p_from is null or p.created_at >= p_from)
          and (p_to is null or p.created_at < p_to))
    ),
    'payment_declarations', jsonb_build_object(
      'total', (select count(*) from public.paiements p
        where (p_from is null or p.created_at >= p_from)
          and (p_to is null or p.created_at < p_to)),
      'by_status', coalesce((
        select jsonb_agg(jsonb_build_object('status', s.statut, 'count', s.n) order by s.statut)
        from (
          select p.statut, count(*)::bigint as n
          from public.paiements p
          where (p_from is null or p.created_at >= p_from)
            and (p_to is null or p.created_at < p_to)
          group by p.statut
        ) s
      ), '[]'::jsonb),
      'by_offer', coalesce((
        select jsonb_agg(jsonb_build_object('offer', s.offre, 'count', s.n) order by s.offre)
        from (
          select p.offre, count(*)::bigint as n
          from public.paiements p
          where (p_from is null or p.created_at >= p_from)
            and (p_to is null or p.created_at < p_to)
          group by p.offre
        ) s
      ), '[]'::jsonb)
    ),
    'confirmed_finance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency', f.currency,
        'events', f.event_count,
        'gross', f.gross,
        'fees', f.fees,
        'commissions', f.commissions,
        'net', f.net
      ) order by f.currency)
      from (
        select l.currency,
          count(*)::bigint as event_count,
          coalesce(sum(l.gross_amount),0)::numeric(18,2) as gross,
          coalesce(sum(l.fee_amount),0)::numeric(18,2) as fees,
          coalesce(sum(l.commission_amount),0)::numeric(18,2) as commissions,
          coalesce(sum(l.net_amount),0)::numeric(18,2) as net
        from private.founder_finance_ledger l
        where l.status = 'confirmed'
          and (p_from is null or l.occurred_at >= p_from)
          and (p_to is null or l.occurred_at < p_to)
        group by l.currency
      ) f
    ), '[]'::jsonb),
    'revenue_note', 'Payment declarations are not proof of cash received. Only confirmed ledger entries are included in finance totals.'
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.founder_business_overview(timestamptz,timestamptz) from public, anon;
grant execute on function public.founder_business_overview(timestamptz,timestamptz) to authenticated;
