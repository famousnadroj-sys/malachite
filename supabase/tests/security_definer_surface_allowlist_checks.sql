-- Explicit allowlist for the SECURITY DEFINER RPC surface.
-- New exposed SECURITY DEFINER functions must be reviewed and added intentionally.
do $security_surface$
declare
  v_allowed_authenticated text[] := array[
    'admin_duplicate_pending_payment_ids()',
    'admin_malachite_referrals()',
    'blocked_user_ids()',
    'check_my_entitlement_expirations()',
    'contact_de(p_autre uuid)',
    'create_my_action_notification(p_category text, p_title text, p_body text, p_dedupe_key text, p_action_type text, p_action_id text, p_related_user_id uuid)',
    'create_my_notification(p_category text, p_title text, p_body text, p_dedupe_key text)',
    'est_match(p_autre uuid)',
    'founder_business_overview(p_from timestamp with time zone, p_to timestamp with time zone)',
    'get_malachite_referrer_preview(p_referrer_id uuid)',
    'is_blocked_with(p_other uuid)',
    'malachite_ai_manager_is_admin()',
    'match_like_quota()',
    'match_received_likes()',
    'match_relation_compatible_ids()',
    'moderate_user(p_user_id uuid, p_action text, p_reason text)',
    'my_blocked_profiles()',
    'public_status_badges()',
    'publish_user_announcement(p_category text, p_title text, p_body text, p_dedupe_key text)',
    'save_my_profile(p_profile jsonb, p_private jsonb)',
    'start_call_session(p_id uuid, p_callee_id uuid, p_room text, p_mode text, p_expires_at timestamp with time zone)',
    'traiter_lot_paiements(pids bigint[])',
    'traiter_paiement(pid bigint, accepter boolean)',
    'traiter_paiement(pid bigint, accepter boolean, raison text)',
    'update_my_avatar(p_avatar jsonb)',
    'update_my_call_session_status(p_id uuid, p_status text)',
    'update_my_preferences(p_preferences jsonb)'
  ];
  -- Production-only RPC: absent from the current staging schema but reviewed separately.
  v_allowed_production_only text[] := array[
    'founder_finance_summary(p_from timestamp with time zone, p_to timestamp with time zone)'
  ];
  v_unexpected text;
  v_missing text;
begin
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    into v_unexpected
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('anon',p.oid,'execute')
    and not (p.proname='get_malachite_referrer_preview'
      and pg_get_function_identity_arguments(p.oid)='p_referrer_id uuid')
  limit 1;
  if v_unexpected is not null then
    raise exception 'unexpected_anon_security_definer_rpc: %',v_unexpected;
  end if;

  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    into v_unexpected
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'execute')
    and (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')') <> all(v_allowed_authenticated || v_allowed_production_only)
  limit 1;
  if v_unexpected is not null then
    raise exception 'unreviewed_authenticated_security_definer_rpc: %',v_unexpected;
  end if;

  select string_agg(x.signature,', ')
    into v_missing
  from unnest(v_allowed_authenticated) x(signature)
  where not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')=x.signature
      and has_function_privilege('authenticated',p.oid,'execute')
  );
  if v_missing is not null then
    raise exception 'expected_authenticated_rpc_missing: %',v_missing;
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and p.proname='get_malachite_referrer_preview'
      and pg_get_function_identity_arguments(p.oid)='p_referrer_id uuid'
      and has_function_privilege('anon',p.oid,'execute')
  ) then
    raise exception 'public_referrer_preview_contract_missing';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting in ('search_path=""','search_path=pg_catalog')
      )
  ) then
    raise exception 'security_definer_function_has_unsafe_search_path';
  end if;
end
$security_surface$;
