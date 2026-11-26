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

-- Replace the previous named job only when pg_cron is installed.
-- Staging may intentionally omit pg_cron/pg_net; the nonce RPC remains usable,
-- but no outbound worker call is scheduled in that environment.
do $replace_legacy_cron$
declare
  r record;
begin
  if to_regclass('cron.job') is null
     or to_regprocedure('cron.unschedule(bigint)') is null then
    raise notice 'pg_cron unavailable; legacy worker cron cannot be replaced and no new job will be scheduled';
    return;
  end if;
  for r in select jobid from cron.job where jobname = 'malachite-ai-ops-worker'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end
$replace_legacy_cron$;

-- Configure both Vault values independently in each Supabase environment:
-- malachite_ai_worker_url = https://<project-ref>.supabase.co/functions/v1/malachite-ai-worker
-- malachite_ai_worker_project_ref = the exact project ref assigned to this database.
-- The second value is an independent allowlist; URL format alone is not identity proof.
do $schedule_nonce_worker$
declare
  v_url text;
  v_expected_ref text;
  v_url_ref text;
  v_command text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'malachite_ai_worker_url'
  limit 1;
  select decrypted_secret into v_expected_ref
  from vault.decrypted_secrets
  where name = 'malachite_ai_worker_project_ref'
  limit 1;

  v_url_ref := substring(v_url from '^https://([a-z0-9]+)\.supabase\.co/functions/v1/malachite-ai-worker$');
  if v_url_ref is null or v_expected_ref is null
     or v_url_ref is distinct from v_expected_ref then
    raise notice 'worker URL project ref does not match the independently configured project ref; cron left unscheduled';
    return;
  end if;

  -- Missing scheduler/HTTP extensions are a supported fail-closed staging state.
  if to_regclass('cron.job') is null
     or to_regprocedure('cron.schedule(text,text,text)') is null
     or to_regnamespace('net') is null then
    raise notice 'pg_cron or pg_net unavailable; worker cron left unscheduled';
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