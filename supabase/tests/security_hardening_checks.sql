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
select n.nspname as schema_name,
       p.proname,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname in (
    'contact_de','est_match','est_premium','limite_messages',
    'limite_rdv','rls_auto_enable','traiter_paiement',
    'blocked_user_ids','is_blocked_with','my_blocked_profiles'
  ))
  or (n.nspname = 'private' and p.proname in (
    'blocked_user_ids','contact_de','est_match','est_premium',
    'my_blocked_profiles','traiter_paiement','is_blocked_with'
  ))
order by n.nspname, p.proname;


-- 6) Fail closed if any public application table loses RLS or anon gains table grants.
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
  ) then
    raise exception 'public_table_without_rls';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and grantee='anon'
  ) then
    raise exception 'anon_has_public_table_privileges';
  end if;

  if has_function_privilege('anon','private.traiter_paiement(bigint,boolean)','EXECUTE')
     or has_function_privilege('anon','private.traiter_paiement(bigint,boolean,text)','EXECUTE') then
    raise exception 'anon_can_execute_private_payment_review_rpc';
  end if;

  if not has_function_privilege('authenticated','private.traiter_paiement(bigint,boolean)','EXECUTE')
     or not has_function_privilege('authenticated','private.traiter_paiement(bigint,boolean,text)','EXECUTE') then
    raise exception 'authenticated_private_payment_review_rpc_grant_missing';
  end if;

  if has_function_privilege('anon','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE')
     or not has_function_privilege('authenticated','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE') then
    raise exception 'call_session_rpc_privileges_invalid';
  end if;

  if not exists (
    select 1 from pg_proc p
    where p.oid='public.start_call_session(uuid,uuid,text,text,timestamp with time zone)'::regprocedure
      and p.prosecdef
      and coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']
  ) then
    raise exception 'call_session_rpc_security_definer_hardening_missing';
  end if;
end
$$;


-- 7) Founder/admin SECURITY DEFINER RPCs must reject anon and check admin identity.
do $$
declare
  v_oid oid;
  v_def text;
begin
  if has_function_privilege('anon','private.is_admin()','EXECUTE')
     or not has_function_privilege('authenticated','private.is_admin()','EXECUTE') then
    raise exception 'private_is_admin_grants_invalid';
  end if;

  foreach v_oid in array array[
    'public.admin_malachite_referrals()'::regprocedure::oid,
    'public.founder_business_overview(timestamptz,timestamptz)'::regprocedure::oid,
    'public.founder_finance_summary(timestamptz,timestamptz)'::regprocedure::oid
  ] loop
    if has_function_privilege('anon',v_oid,'EXECUTE')
       or not has_function_privilege('authenticated',v_oid,'EXECUTE') then
      raise exception 'founder_admin_rpc_grants_invalid: %', v_oid::regprocedure;
    end if;
    select lower(pg_get_functiondef(v_oid)) into v_def;
    if position('auth.uid()' in v_def)=0
       or position('private.is_admin()' in v_def)=0
       or position('search_path to ''''' in v_def)=0 then
      raise exception 'founder_admin_rpc_guard_missing: %', v_oid::regprocedure;
    end if;
  end loop;
end
$$;

-- 8) The referral preview is intentionally public, but must return only public
-- profile fields and hide profiles marked private.
do $$
declare v_def text;
begin
  if not has_function_privilege('anon','public.get_malachite_referrer_preview(uuid)','EXECUTE') then
    raise exception 'public_referrer_preview_grant_missing';
  end if;
  select lower(pg_get_functiondef('public.get_malachite_referrer_preview(uuid)'::regprocedure))
    into v_def;
  if position('profile_private' in v_def)=0
     or position('false' in v_def)=0
     or position('p.prenom' in v_def)=0
     or position('p.username' in v_def)=0
     or position('security definer' in v_def)=0
     or position('search_path to ''''' in v_def)=0 then
    raise exception 'public_referrer_preview_privacy_guard_missing';
  end if;
end
$$;

-- 9) Call-session entrypoint must remain authenticated, short-lived, mutual-match
-- gated, entitlement-gated, block-aware and serialized against active calls.
do $$
declare v_def text;
begin
  select lower(pg_get_functiondef(
    'public.start_call_session(uuid,uuid,text,text,timestamptz)'::regprocedure
  )) into v_def;
  if position('auth.uid()' in v_def)=0
     or position('mutual_match_required' in v_def)=0
     or position('call_entitlement_required' in v_def)=0
     or position('call_already_active' in v_def)=0
     or position('is_blocked_with' in v_def)=0
     or position('security definer' in v_def)=0
     or position('search_path to ''''' in v_def)=0 then
    raise exception 'call_session_security_guard_missing';
  end if;
end
$$;


-- 10) Server-only operational tables must stay inaccessible to client roles.
-- RLS without policies is intentional here: these records are accessed only
-- through trusted server functions using the service role. Keep this assertion
-- so a future grant cannot silently expose queues, audit logs, AI controls,
-- referrals, or the founder ledger through the Data API.
do $$
declare
  v_item record;
  v_table regclass;
begin
  for v_item in
    select * from (values
      ('private','admins'),
      ('private','founder_finance_ledger'),
      ('public','admin_push_queue'),
      ('public','admin_push_subscriptions'),
      ('public','ai_manager_audit'),
      ('public','ai_ops_runs'),
      ('public','malachite_ai_alerts'),
      ('public','malachite_ai_review_queue'),
      ('public','malachite_ai_settings'),
      ('public','malachite_referrals')
    ) as protected(schema_name, table_name)
  loop
    v_table := to_regclass(format('%I.%I',v_item.schema_name,v_item.table_name));
    if v_table is null then
      raise exception 'server_only_table_missing: %.%',v_item.schema_name,v_item.table_name;
    end if;

    if not (select c.relrowsecurity from pg_class c where c.oid=v_table) then
      raise exception 'server_only_table_rls_disabled: %.%',v_item.schema_name,v_item.table_name;
    end if;

    if has_table_privilege('anon',v_table,'SELECT')
       or has_table_privilege('anon',v_table,'INSERT')
       or has_table_privilege('anon',v_table,'UPDATE')
       or has_table_privilege('anon',v_table,'DELETE')
       or has_table_privilege('authenticated',v_table,'SELECT')
       or has_table_privilege('authenticated',v_table,'INSERT')
       or has_table_privilege('authenticated',v_table,'UPDATE')
       or has_table_privilege('authenticated',v_table,'DELETE') then
      raise exception 'server_only_table_client_grant_detected: %.%',v_item.schema_name,v_item.table_name;
    end if;
  end loop;
end
$$;
