do $$
begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
create schema if not exists vault;
create schema if not exists cron;

create table if not exists vault.decrypted_secrets(
  name text primary key,
  decrypted_secret text not null
);
insert into vault.decrypted_secrets(name,decrypted_secret)
values('malachite_ai_worker_hmac','isolated-test-secret-do-not-use-in-production')
on conflict(name) do update set decrypted_secret=excluded.decrypted_secret;

create or replace function cron.schedule(jobname text, schedule text, command text)
returns bigint language sql as $ select 1::bigint $;

create or replace function cron.unschedule(job_id bigint)
returns boolean language sql as $ select true $;

create or replace function public.verify_malachite_ai_worker_signature(
  p_timestamp text,p_body text,p_signature text
)
returns boolean language sql security definer
as $$ select false $$;
