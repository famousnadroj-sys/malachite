-- Atomic replay prevention for signed Malachite AI worker requests.
-- The existing cron already sends a short-lived HMAC over timestamp + exact body.
-- Derive the nonce from timestamp + signature so legacy cron payloads need no
-- request_id field and the active destination/schedule can remain untouched.

do $preflight_worker_cron$
declare
  r record;
  v_command text;
  v_hmac_secret text;
  v_url text;
  v_expected_ref text;
  v_url_ref text;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;
  if not exists(select 1 from cron.job where jobname='malachite-ai-ops-worker' and active) then
    return;
  end if;

  select command into v_command
  from cron.job
  where jobname='malachite-ai-ops-worker' and active
  order by jobid desc limit 1;

  select decrypted_secret into v_hmac_secret
  from vault.decrypted_secrets where name='malachite_ai_worker_hmac' limit 1;

  -- Preserve an active worker only if it already signs requests. Do not
  -- rewrite its URL/schedule or require new URL/project-ref secrets.
  if v_command is null
     or v_command not like '%x-mal-timestamp%'
     or v_command not like '%x-mal-signature%'
     or v_command not like '%malachite_ai_worker_hmac%'
     or v_command not like '%/functions/v1/malachite-ai-worker%'
     or length(coalesce(v_hmac_secret,'')) < 32 then
    raise exception 'active worker cron is not HMAC configured; migration aborted without changing verifier or cron';
  end if;

  -- If optional destination identity secrets are already configured, verify
  -- they agree. Missing URL/ref secrets are not a blocker because the existing
  -- signed cron command is preserved byte-for-byte.
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name='malachite_ai_worker_url' limit 1;
  select decrypted_secret into v_expected_ref
  from vault.decrypted_secrets where name='malachite_ai_worker_project_ref' limit 1;
  if v_url is not null and v_expected_ref is not null then
    v_url_ref := substring(v_url from '^https://([a-z0-9]+)\.supabase\.co/functions/v1/malachite-ai-worker$');
    if v_url_ref is null or v_url_ref is distinct from v_expected_ref then
      raise exception 'worker URL/project-ref mismatch; migration aborted without changing verifier or cron';
    end if;
  end if;
end
$preflight_worker_cron$;

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
  v_nonce_hex text;
  v_request_id uuid;
  v_claimed uuid;
begin
  if p_timestamp is null or p_body is null or p_signature is null
     or octet_length(p_body) > 8192
     or p_timestamp !~ '^[0-9]{10}$'
     or p_signature !~ '^[0-9a-f]{64}$' then
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
  if v_secret is null or length(v_secret) < 32 then return false; end if;

  v_expected := encode(
    extensions.hmac(
      convert_to(p_timestamp || '.' || p_body, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  if v_expected <> lower(p_signature) then return false; end if;

  -- HMAC covers the exact body and timestamp, so the signature is a stable unique
  -- request fingerprint. Replaying the same signed request reuses this nonce;
  -- a new signed invocation gets a different signature even without request_id.
  v_nonce_hex := lower(p_signature);
  v_request_id := (
    substr(v_nonce_hex,1,8) || '-' ||
    substr(v_nonce_hex,9,4) || '-' ||
    substr(v_nonce_hex,13,4) || '-' ||
    substr(v_nonce_hex,17,4) || '-' ||
    substr(v_nonce_hex,21,12)
  )::uuid;

  insert into private.malachite_ai_worker_nonces(request_id)
  values (v_request_id)
  on conflict (request_id) do nothing
  returning request_id into v_claimed;
  if v_claimed is null then return false; end if;

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

-- Intentionally do not reschedule/replace the existing cron. The verifier is
-- compatible with its current signed body and adds replay rejection server-side.
