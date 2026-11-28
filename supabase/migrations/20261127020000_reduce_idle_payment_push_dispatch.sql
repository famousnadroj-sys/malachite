-- Keep the direct payment insert trigger immediate, but make the cron worker a
-- low-frequency recovery path. It must not call the Edge Function while idle.
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
