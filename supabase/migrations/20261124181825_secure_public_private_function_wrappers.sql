-- Public RPC wrappers call private-schema functions whose callees enforce
-- authentication, admin, entitlement, match, and ownership checks. Keep the
-- private schema itself inaccessible to client roles.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.admin_duplicate_pending_payment_ids()',
    'public.blocked_user_ids()',
    'public.check_my_entitlement_expirations()',
    'public.contact_de(uuid)',
    'public.create_my_action_notification(text,text,text,text,text,text,uuid)',
    'public.create_my_notification(text,text,text,text)',
    'public.is_blocked_with(uuid)',
    'public.malachite_ai_manager_is_admin()',
    'public.moderate_user(uuid,text,text)',
    'public.my_blocked_profiles()',
    'public.publish_user_announcement(text,text,text,text)',
    'public.traiter_lot_paiements(bigint[])',
    'public.traiter_paiement(bigint,boolean)',
    'public.traiter_paiement(bigint,boolean,text)'
  ] loop
    execute format('alter function %s security definer', v_signature);
    execute format('alter function %s set search_path = %L', v_signature, '');
  end loop;
end
$$;
