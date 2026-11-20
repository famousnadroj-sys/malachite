-- Additive foundation for scheduled, signed Malachite AI operations.
create extension if not exists pg_net with schema extensions;
-- Does not alter existing application data, policies, or RPCs.
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

-- Generate the scheduler/worker HMAC secret inside Vault. It never enters source control
-- or the pg_net request queue; only a short-lived signature is sent to the Edge Function.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'malachite_ai_worker_hmac') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'malachite_ai_worker_hmac',
      'HMAC key for signed pg_cron calls to the Malachite AI operations worker'
    );
  end if;
end
$$;

create or replace function public.verify_malachite_ai_worker_signature(
  p_timestamp text,
  p_body text,
  p_signature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_expected text;
  v_epoch bigint;
begin
  if p_timestamp is null or p_body is null or p_signature is null then
    return false;
  end if;
  if p_timestamp !~ '^[0-9]{10}$' or p_signature !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  v_epoch := p_timestamp::bigint;
  if abs(extract(epoch from clock_timestamp())::bigint - v_epoch) > 300 then
    return false;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'malachite_ai_worker_hmac'
  limit 1;

  if v_secret is null then
    return false;
  end if;

  v_expected := encode(
    extensions.hmac(
      convert_to(p_timestamp || '.' || p_body, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  return v_expected = lower(p_signature);
exception when others then
  return false;
end;
$$;

revoke all on function public.verify_malachite_ai_worker_signature(text,text,text)
  from public, anon, authenticated;
grant execute on function public.verify_malachite_ai_worker_signature(text,text,text)
  to service_role;

-- A named cron.schedule upsert makes this migration safe if the job already exists.
select cron.schedule(
  'malachite-ai-ops-worker',
  '*/15 * * * *',
  $cron$
    with request_data as (
      select
        extract(epoch from clock_timestamp())::bigint::text as ts,
        '{"trigger":"cron"}'::jsonb as body,
        (select decrypted_secret from vault.decrypted_secrets
          where name = 'malachite_ai_worker_hmac' limit 1) as secret
    )
    select net.http_post(
      url := 'https://tscsmemsvgacqioncash.supabase.co/functions/v1/malachite-ai-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-mal-timestamp', ts,
        'x-mal-signature', encode(
          extensions.hmac(
            convert_to(ts || '.' || body::text, 'UTF8'),
            convert_to(secret, 'UTF8'),
            'sha256'
          ),
          'hex'
        )
      ),
      body := body,
      timeout_milliseconds := 10000
    )
    from request_data
    where secret is not null;
  $cron$
);
