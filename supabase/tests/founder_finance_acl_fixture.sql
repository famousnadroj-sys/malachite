do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$$;

create function public.founder_finance_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table(
  currency varchar,
  confirmed_events bigint,
  gross_inflow numeric,
  gross_outflow numeric,
  fees_amount numeric,
  commissions_amount numeric,
  net_cash_flow numeric
)
language sql
as $$
  select null::varchar, 0::bigint, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric
  where false;
$$;
