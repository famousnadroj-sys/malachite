-- Read-only checks for account-deletion audit-reference preparation.
-- Run after the migration on staging or a disposable database.
do $$
declare
  v_delete_actions text[];
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='campagnes'
      and column_name='cree_par' and is_nullable <> 'YES'
  ) then
    raise exception 'campaign_creator_must_be_nullable';
  end if;

  select array_agg(c.confdeltype::text order by c.conname)
    into v_delete_actions
  from pg_constraint c
  where c.contype='f'
    and c.conrelid in ('public.campagnes'::regclass,
                       'public.demandes_support'::regclass,
                       'public.signalements'::regclass)
    and c.confrelid='auth.users'::regclass
    and c.conname in ('campagnes_cree_par_fkey',
                      'demandes_support_traite_par_fkey',
                      'signalements_traite_par_fkey');

  if coalesce(array_length(v_delete_actions,1),0) <> 3
     or exists (
       select 1 from pg_constraint c
       where c.contype='f'
         and c.conrelid in ('public.campagnes'::regclass,
                            'public.demandes_support'::regclass,
                            'public.signalements'::regclass)
         and c.confrelid='auth.users'::regclass
         and c.conname in ('campagnes_cree_par_fkey',
                           'demandes_support_traite_par_fkey',
                           'signalements_traite_par_fkey')
         and c.confdeltype <> 'n'
     ) then
    raise exception 'account_deletion_audit_references_must_set_null';
  end if;
end
$$;
