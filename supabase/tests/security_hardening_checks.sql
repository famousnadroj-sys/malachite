-- Read-only post-migration verification for Malachite.
-- Run only after applying the staged migration on a disposable/staging database.

-- 1) RLS must be enabled on all public application tables.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2) Confirm report moderation columns and policies.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'signalements'
  and column_name in ('statut','traite_par','traite_le','note_admin')
order by ordinal_position;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'signalements'
order by policyname;

-- 3) Confirm member-blocking table and policies.
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'blocages'
order by policyname;

-- 4) Anonymous role must not retain public-table privileges.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
order by table_name, privilege_type;

-- 5) Confirm SECURITY DEFINER execution is no longer granted to anon.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'contact_de','est_match','est_premium','limite_messages',
    'limite_rdv','rls_auto_enable','traiter_paiement',
    'blocked_user_ids','is_blocked_with','my_blocked_profiles'
  )
order by p.proname;
