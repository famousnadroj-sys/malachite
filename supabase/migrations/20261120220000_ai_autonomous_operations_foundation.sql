-- Malachite autonomous operations foundation.
-- Additive only: no existing application tables, policies, or functions are modified.
create table if not exists public.ai_ops_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger_source text not null default 'cron'
    check (trigger_source in ('cron','manual')),
  status text not null default 'failed'
    check (status in ('success','partial','failed')),
  metrics jsonb not null default '{}'::jsonb,
  summary text,
  model text,
  error_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0)
);

alter table public.ai_ops_runs enable row level security;
revoke all on table public.ai_ops_runs from public, anon, authenticated;
grant select, insert, update on table public.ai_ops_runs to service_role;
grant usage, select on sequence public.ai_ops_runs_id_seq to service_role;

create index if not exists ai_ops_runs_started_at_idx
  on public.ai_ops_runs (started_at desc);
create index if not exists ai_ops_runs_status_started_at_idx
  on public.ai_ops_runs (status, started_at desc);
