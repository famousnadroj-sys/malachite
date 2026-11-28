do $client_acl$
begin
  if has_table_privilege('authenticated','public.avis_site','update')
     or has_table_privilege('authenticated','public.avis_site','delete') then
    raise exception 'avis_site_must_be_insert_only';
  end if;
  if has_table_privilege('authenticated','public.avis_match','delete')
     or has_table_privilege('authenticated','public.rendez_vous','delete')
     or has_table_privilege('authenticated','public.signalements','delete') then
    raise exception 'unused_authenticated_delete_grant_remains';
  end if;
  if has_table_privilege('authenticated','public.avis_match','update')
     or has_table_privilege('authenticated','public.rendez_vous','update')
     or has_table_privilege('authenticated','public.signalements','update') then
    raise exception 'table_wide_update_grant_must_be_column_scoped';
  end if;
  if has_table_privilege('authenticated','public.user_notifications','insert')
     or has_table_privilege('authenticated','public.user_notifications','delete') then
    raise exception 'user_notifications_must_be_rpc_insert_and_no_delete';
  end if;

  if has_table_privilege('authenticated','public.demandes_support','update') then
    raise exception 'support_updates_must_be_column_scoped';
  end if;
  if not has_column_privilege('authenticated','public.demandes_support','statut','update')
     or not has_column_privilege('authenticated','public.demandes_support','reponse_admin','update')
     or not has_column_privilege('authenticated','public.demandes_support','traite_par','update')
     or not has_column_privilege('authenticated','public.demandes_support','traite_le','update') then
    raise exception 'support_admin_update_columns_missing';
  end if;
  if has_table_privilege('authenticated','public.messages','update')
     or has_table_privilege('authenticated','public.messages','delete') then
    raise exception 'messages_must_be_append_only';
  end if;

  if has_table_privilege('authenticated','public.profiles','update') then
    raise exception 'profile_update_must_be_column_scoped';
  end if;
  if not has_column_privilege('authenticated','public.profiles','derniere_vue','update') then
    raise exception 'online_presence_update_grant_missing';
  end if;
  if has_column_privilege('authenticated','public.profiles','bio','update') then
    raise exception 'profile_content_must_use_validated_rpc';
  end if;

  if not has_column_privilege('authenticated','public.avis_match','autre','update')
     or not has_column_privilege('authenticated','public.avis_match','ok','update') then
    raise exception 'match_vote_upsert_columns_missing';
  end if;
  if not has_column_privilege('authenticated','public.rendez_vous','statut','update') then
    raise exception 'appointment_reply_status_update_missing';
  end if;
  if not has_column_privilege('authenticated','public.signalements','statut','update')
     or not has_column_privilege('authenticated','public.signalements','traite_par','update')
     or not has_column_privilege('authenticated','public.signalements','traite_le','update') then
    raise exception 'admin_report_resolution_columns_missing';
  end if;
  if not has_column_privilege('authenticated','public.message_receipts','read_at','update') then
    raise exception 'message_read_receipt_update_missing';
  end if;
  if not has_column_privilege('authenticated','public.user_notifications','read_at','update') then
    raise exception 'notification_mark_read_update_missing';
  end if;

  if not has_table_privilege('authenticated','public.avis_site','insert')
     or not has_table_privilege('authenticated','public.avis_site','select') then
    raise exception 'avis_site_submission_or_read_access_missing';
  end if;
  if not has_table_privilege('authenticated','public.user_notifications','select') then
    raise exception 'notification_read_access_missing';
  end if;
  if not has_table_privilege('authenticated','public.messages','select')
     or not has_table_privilege('authenticated','public.messages','insert') then
    raise exception 'message_read_or_send_access_missing';
  end if;
end
$client_acl$;
