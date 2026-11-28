-- Required before 202611180002_moderation_and_blocking.sql, which creates
-- RLS policies that call private.is_admin(). The original allowlist migration
-- was lost from source control; this restores the prerequisite without seeding
-- any administrator identity.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

create table if not exists private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admins enable row level security;
revoke all on table private.admins from public,anon,authenticated,service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from private.admins
    where user_id=(select auth.uid())
  )
$function$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
