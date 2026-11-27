create schema if not exists auth;
create schema if not exists private;
create table auth.users(id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $roles$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create schema if not exists cron;
create table cron.job(
 jobid bigint generated always as identity primary key,
 jobname text unique not null,
 schedule text not null,
 command text not null,
 active boolean not null default true
);
create or replace function cron.schedule(job_name text,schedule text,command text)
returns bigint language plpgsql
as $cron$
declare v_id bigint;
begin
 insert into cron.job(jobname,schedule,command,active) values($1,$2,$3,true)
 on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command,active=true
 returning jobid into v_id;
 return v_id;
end
$cron$;

insert into auth.users(id) values
 ('50000000-0000-0000-0000-000000000001'),
 ('60000000-0000-0000-0000-000000000001');
