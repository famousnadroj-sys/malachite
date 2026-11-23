-- Founder finance foundation for MALACHITE production.
-- Prepared on an isolated Git branch only. Do not apply until explicitly approved.
create table if not exists private.founder_finance_ledger (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'payment_received','payment_refunded','payment_fee','platform_commission',
    'creator_payout','campaign_revenue','subscription_revenue','boost_revenue',
    'call_revenue','operating_cost','tax','adjustment'
  )),
  source_table text,
  source_id text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','reversed','cancelled')),
  gross_amount numeric not null check (gross_amount >= 0),
  fee_amount numeric not null default 0 check (fee_amount >= 0),
  commission_amount numeric not null default 0 check (commission_amount >= 0),
  net_amount numeric,
  currency char(3) not null check (currency = upper(currency)),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  country_code char(2),
  channel text,
  reference_code text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  constraint founder_finance_ledger_source_unique unique (source_table, source_id, event_type)
);

create index if not exists founder_finance_ledger_occurred_status_idx
  on private.founder_finance_ledger (occurred_at, status);
create index if not exists founder_finance_ledger_event_currency_idx
  on private.founder_finance_ledger (event_type, currency, occurred_at);

alter table private.founder_finance_ledger enable row level security;
revoke all on table private.founder_finance_ledger from public, anon, authenticated;

create or replace function public.founder_finance_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  currency character,
  confirmed_events bigint,
  gross_amount numeric,
  fees_amount numeric,
  commissions_amount numeric,
  net_amount numeric
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
    select l.currency, count(*)::bigint,
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
        'currency', f.currency, 'events', f.event_count, 'gross', f.gross,
        'fees', f.fees, 'commissions', f.commissions, 'net', f.net
      ) order by f.currency)
      from (
        select l.currency, count(*)::bigint as event_count,
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

revoke all on function public.founder_finance_summary(timestamptz,timestamptz) from public, anon;
revoke all on function public.founder_business_overview(timestamptz,timestamptz) from public, anon;
grant execute on function public.founder_finance_summary(timestamptz,timestamptz) to authenticated;
grant execute on function public.founder_business_overview(timestamptz,timestamptz) to authenticated;
