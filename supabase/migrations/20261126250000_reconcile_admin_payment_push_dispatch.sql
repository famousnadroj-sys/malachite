-- Reconcile the production admin payment-push dispatch schema and server hooks.
-- Recovered from read-only production catalogs/function definitions on 27 Nov 2026.
-- No VAPID key material is included; configure the VAPID Vault secrets separately.
-- Project URL is environment-specific and must be stored as malachite_push_project_url.

-- These Supabase-managed extensions are required by the queue dispatcher.
-- Production already has them; staging/replay environments may not.
create schema if not exists extensions;
do $extensions$
begin
  if exists (select 1 from pg_available_extensions where name='pg_net') then
    execute 'create extension if not exists pg_net with schema extensions';
  elsif to_regnamespace('net') is null then
    raise exception 'pg_net_extension_or_test_stub_required';
  end if;
  if exists (select 1 from pg_available_extensions where name='pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
  elsif to_regnamespace('cron') is null then
    raise exception 'pg_cron_extension_or_test_stub_required';
  end if;
end
$extensions$;

create table if not exists public.admin_push_queue (
  payment_id bigint primary key references public.paiements(id) on delete cascade,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists admin_push_queue_pending_idx
  on public.admin_push_queue(created_at)
  where delivered_at is null;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  device_label text not null default 'Appareil',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists admin_push_subscriptions_active_idx
  on public.admin_push_subscriptions(admin_user_id,last_seen_at desc)
  where revoked_at is null;

alter table public.admin_push_queue enable row level security;
alter table public.admin_push_subscriptions enable row level security;
revoke all on table public.admin_push_queue,public.admin_push_subscriptions
  from public,anon,authenticated;
grant all on table public.admin_push_queue,public.admin_push_subscriptions
  to service_role;

-- Internal hook secret is created in Vault if absent; its value never enters SQL source.
do $$
begin
  if not exists (select 1 from vault.secrets where name='malachite_push_hook') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32),'hex'),
      'malachite_push_hook',
      'Private webhook token for payment push notifications'
    );
  end if;
end
$$;

create or replace function public.get_malachite_push_secrets()
returns jsonb
language sql
security definer
set search_path to ''
as $function$
  select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('malachite_vapid_public','malachite_vapid_private','malachite_push_hook');
$function$;
revoke all on function public.get_malachite_push_secrets() from public,anon,authenticated;
grant execute on function public.get_malachite_push_secrets() to service_role;

create or replace function private.notify_admin_new_payment_push()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hook_secret text;
  project_url text;
begin
  if exists (select 1 from public.admin_push_subscriptions where revoked_at is null) then
    insert into public.admin_push_queue(payment_id)
    values(new.id)
    on conflict(payment_id) do nothing;

    select decrypted_secret into hook_secret
    from vault.decrypted_secrets
    where name='malachite_push_hook'
    limit 1;

    select decrypted_secret into project_url
    from vault.decrypted_secrets
    where name='malachite_push_project_url'
    limit 1;

    if hook_secret is not null and length(hook_secret)>0
       and project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co/?$' then
      perform net.http_post(
        url := regexp_replace(project_url, '/+$', '') || '/functions/v1/malachite-admin-push',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-malachite-hook',hook_secret
        ),
        body := jsonb_build_object('action','payment','payment_id',new.id)
      );
    else
      raise warning 'Malachite push URL or hook secret is missing/invalid; payment % remains queued for configured fallback dispatch.',new.id;
    end if;
  end if;
  return new;
exception when others then
  raise warning 'Malachite payment push enqueue/dispatch failed for payment %: %',new.id,SQLERRM;
  return new;
end;
$function$;
revoke all on function private.notify_admin_new_payment_push() from public,anon,authenticated;

drop trigger if exists trg_admin_new_payment_push on public.paiements;
create trigger trg_admin_new_payment_push
after insert on public.paiements
for each row execute function private.notify_admin_new_payment_push();

-- Named cron.schedule updates the existing job instead of creating duplicates.
-- It deliberately does nothing until the project-specific Vault URL and hook exist.
select cron.schedule(
  'malachite-admin-payment-push-batch',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := regexp_replace(
        (select decrypted_secret from vault.decrypted_secrets where name='malachite_push_project_url'),
        '/+$',''
      ) || '/functions/v1/malachite-admin-push',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-malachite-hook',(select decrypted_secret from vault.decrypted_secrets where name='malachite_push_hook')
      ),
      body := jsonb_build_object('action','drain')
    )
    where (select decrypted_secret from vault.decrypted_secrets where name='malachite_push_project_url')
            ~ '^https://[a-z0-9-]+[.]supabase[.]co/?$'
      and coalesce((select decrypted_secret from vault.decrypted_secrets where name='malachite_push_hook'),'') <> ''
      and exists(select 1 from public.admin_push_queue where delivered_at is null)
      and exists(select 1 from public.admin_push_subscriptions where revoked_at is null);
  $cron$
);
