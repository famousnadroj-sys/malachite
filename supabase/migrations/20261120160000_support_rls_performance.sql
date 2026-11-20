-- Improve support-table FK lookups and avoid per-row auth helper evaluation.
begin;

create index if not exists demandes_support_user_id_idx
  on public.demandes_support (user_id);
create index if not exists demandes_support_traite_par_idx
  on public.demandes_support (traite_par);

drop policy if exists support_insert_own on public.demandes_support;
create policy support_insert_own
on public.demandes_support
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists support_read_own_or_admin on public.demandes_support;
create policy support_read_own_or_admin
on public.demandes_support
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='demandes_support'
      and indexname='demandes_support_user_id_idx'
  ) then raise exception 'support_user_id_index_missing'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='demandes_support'
      and indexname='demandes_support_traite_par_idx'
  ) then raise exception 'support_traite_par_index_missing'; end if;
end
$$;

commit;
