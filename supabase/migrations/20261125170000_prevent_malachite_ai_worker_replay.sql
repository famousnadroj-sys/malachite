-- Prevent a captured signed worker request from being accepted more than once.
-- Each invocation carries a unique request_id inside the signed JSON body.
create table if not exists private.malachite_ai_worker_nonces (
  request_id uuid primary key,
  consumed_at timestamptz not null default clock_timestamp()
);

alter table private.malachite_ai_worker_nonces enable row level security;
revoke all on table private.malachite_ai_worker_nonces from public, anon, authenticated, service_role;

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
  v_request_id uuid;
  v_claimed uuid;
begin
  if p_timestamp is null or p_body is null or p_signature is null
     or octet_length(p_body) > 8192 then
    return false;
  end if;
  if p_timestamp !~ '^[0-9]{10}$' or p_signature !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  v_epoch := p_timestamp::bigint;
  if abs(extract(epoch from clock_timestamp())::bigint - v_epoch) > 300 then
    return false;
  end if;

  begin
    v_request_id := (p_body::jsonb ->> 'request_id')::uuid;
  exception when others then
    return false;
  end;
  if v_request_id is null then
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
  if v_expected <> lower(p_signature) then
    return false;
  end if;

  -- The unique key makes replay rejection atomic even for concurrent requests.
  insert into private.malachite_ai_worker_nonces(request_id)
  values (v_request_id)
  on conflict (request_id) do nothing
  returning request_id into v_claimed;
  if v_claimed is null then
    return false;
  end if;

  -- Keep only a short replay-detection window; request timestamps expire after 5 minutes.
  delete from private.malachite_ai_worker_nonces
  where consumed_at < clock_timestamp() - interval '1 day';

  return true;
exception when others then
  return false;
end;
$$;

revoke all on function public.verify_malachite_ai_worker_signature(text,text,text)
  from public, anon, authenticated;
grant execute on function public.verify_malachite_ai_worker_signature(text,text,text)
  to service_role;

-- Replace the previous named job before scheduling the nonce-aware request.
-- Without this, the legacy cron command (which has no request_id) could remain
-- active alongside the hardened worker and generate repeated unauthorized calls.
do $replace_legacy_cron$
declare
  r record;
begin
  for r in select jobid from cron.job where jobname = 'malachite-ai-ops-worker'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$replace_legacy_cron$;

-- Configure this Vault secret separately in each Supabase environment:
-- malachite_ai_worker_url = https://<that-project-ref>.supabase.co/functions/v1/malachite-ai-worker
-- Never embed the production project URL in a migration that also runs on staging.
do $schedule_nonce_worker$
declare
  v_url text;
  v_command text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'malachite_ai_worker_url'
  limit 1;

  -- Fail closed: do not schedule any outbound worker call unless this environment
  -- has an explicitly configured, project-local Edge Function URL.
  if v_url is null
     or v_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/malachite-ai-worker$' then
    raise notice 'malachite_ai_worker_url missing or invalid; worker cron left unscheduled';
    return;
  end if;

  v_command := format($cron$
    with request_data as (
      select
        extract(epoch from clock_timestamp())::bigint::text as ts,
        jsonb_build_object('trigger', 'cron', 'request_id', gen_random_uuid()::text) as body,
        (select decrypted_secret from vault.decrypted_secrets
          where name = 'malachite_ai_worker_hmac' limit 1) as secret
    )
    select net.http_post(
      url := %L,
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
  $cron$, v_url);

  perform cron.schedule(
    'malachite-ai-ops-worker',
    '*/15 * * * *',
    v_command
  );
end
$schedule_nonce_worker$;
