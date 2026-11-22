-- Founder finance ledger foundation (staging-first).
-- Append-only accounting events; do not store customer PII, payment credentials,
-- phone numbers, receipts, access tokens, or other secrets in metadata.
create schema if not exists private;

create table if not exists private.founder_finance_ledger (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'payment_received',
    'payment_refunded',
    'payment_fee',
    'platform_commission',
    'creator_payout',
    'campaign_revenue',
    'subscription_revenue',
    'boost_revenue',
    'call_revenue',
    'operating_cost',
    'tax',
    'adjustment'
  )),
  source_table text,
  source_id text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','reversed','cancelled')),
  gross_amount numeric(18,2) not null check (gross_amount >= 0),
  fee_amount numeric(18,2) not null default 0 check (fee_amount >= 0),
  commission_amount numeric(18,2) not null default 0 check (commission_amount >= 0),
  net_amount numeric(18,2) generated always as
    (gross_amount - fee_amount - commission_amount) stored,
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

comment on table private.founder_finance_ledger is
  'Append-only internal finance ledger. No customer credentials or payment secrets belong here.';
comment on column private.founder_finance_ledger.metadata is
  'Non-sensitive operational metadata only; never store phone numbers, receipts, tokens, or personal payment details.';

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

revoke all on table private.founder_finance_ledger from public, anon, authenticated;
grant select, insert on table private.founder_finance_ledger to service_role;

revoke update, delete, truncate, references, trigger on table private.founder_finance_ledger from service_role;

create index if not exists founder_finance_ledger_occurred_at_idx
  on private.founder_finance_ledger (occurred_at desc);
create index if not exists founder_finance_ledger_status_currency_idx
  on private.founder_finance_ledger (status, currency);
create index if not exists founder_finance_ledger_event_type_idx
  on private.founder_finance_ledger (event_type, occurred_at desc);
