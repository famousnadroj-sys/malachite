do $$
begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;

create schema extensions;
create extension pgcrypto with schema extensions;
create schema private;
create schema vault;
create table vault.decrypted_secrets(name text primary key, decrypted_secret text not null);
insert into vault.decrypted_secrets(name,decrypted_secret) values
 ('malachite_ai_worker_hmac','isolated-test-secret-do-not-use-in-production'),
 ('malachite_ai_worker_url','https://stagingtest.supabase.co/functions/v1/malachite-ai-worker'),
 ('malachite_ai_worker_project_ref','stagingtest');
