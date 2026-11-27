create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create table auth.users(id uuid primary key);
create schema if not exists vault;
create table vault.secrets(
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 description text,
 secret text not null
);
create view vault.decrypted_secrets as select name,secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(p_secret text,p_name text,p_description text default null)
returns uuid language plpgsql security definer
as $$
declare v_id uuid;
begin
 insert into vault.secrets(name,description,secret) values(p_name,p_description,p_secret)
 on conflict(name) do update set description=excluded.description,secret=excluded.secret
 returning id into v_id;
 return v_id;
end
$$;

create schema if not exists net;
create table net.requests(id bigint generated always as identity primary key,url text,headers jsonb,body jsonb);
create or replace function net.http_post(url text,headers jsonb,body jsonb)
returns bigint language plpgsql
as $$
declare v_id bigint;
begin
 insert into net.requests(url,headers,body) values($1,$2,$3) returning id into v_id;
 return v_id;
end
$$;

create schema if not exists cron;
create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean not null default true);
create or replace function cron.schedule(job_name text,schedule text,command text)
returns bigint language plpgsql
as $$
declare v_id bigint;
begin
 insert into cron.job(jobname,schedule,command,active) values($1,$2,$3,true)
 on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command,active=true
 returning jobid into v_id;
 return v_id;
end
$$;

create schema if not exists private;
create table public.paiements(id bigint generated always as identity primary key);
do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $roles$;
insert into auth.users(id) values('50000000-0000-0000-0000-000000000001');
