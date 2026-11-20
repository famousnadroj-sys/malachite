create table if not exists public.ai_manager_audit (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  model text not null,
  status text not null check (status in ('success','error','blocked')),
  input_chars integer not null check (input_chars between 0 and 2000),
  output_chars integer not null check (output_chars between 0 and 10000),
  created_at timestamptz not null default now()
);
alter table public.ai_manager_audit enable row level security;
revoke all on table public.ai_manager_audit from anon, authenticated;
grant select, insert on table public.ai_manager_audit to service_role;
create index if not exists ai_manager_audit_admin_created_idx
  on public.ai_manager_audit (admin_id, created_at desc);

create or replace function public.malachite_ai_manager_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce(private.is_admin(), false);
$$;
revoke all on function public.malachite_ai_manager_is_admin() from public, anon;
grant execute on function public.malachite_ai_manager_is_admin() to authenticated;
