begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001');
insert into public.profiles(id,prenom) values
 ('10000000-0000-0000-0000-000000000001','Caller'),
 ('20000000-0000-0000-0000-000000000001','Recipient'),
 ('30000000-0000-0000-0000-000000000001','Suspended');
insert into public.suspensions values ('30000000-0000-0000-0000-000000000001');
insert into public.statuts values ('10000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.avis_match values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true),
 ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',true),
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true);
do $provider$
begin
  if public.call_provider_is_enabled() then
    raise exception 'call_provider_must_default_to_disabled';
  end if;
  if has_function_privilege('anon','public.call_provider_is_enabled()','EXECUTE') then
    raise exception 'anon_must_not_read_call_provider_state';
  end if;
  if not has_function_privilege('authenticated','public.call_provider_is_enabled()','EXECUTE') then
    raise exception 'authenticated_provider_check_missing';
  end if;
end
$provider$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $disabled$
begin
  if public.call_provider_is_enabled() then
    raise exception 'call_provider_enabled_before_setup';
  end if;
  begin
    perform * from public.start_call_session(
      '90000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000001',
      'provider-disabled-room','audio',now()+interval '1 minute');
    raise exception 'disabled_call_provider_created_session';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'secure_call_provider_unavailable' then raise; end if;
  end;
end
$disabled$;
reset role;
do $empty$
begin
  if exists(select 1 from public.call_sessions) then
    raise exception 'disabled_call_provider_left_session';
  end if;
end
$empty$;
update private.call_provider_config set enabled=true, updated_at=now() where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $call$ begin
 perform public.start_call_session(
  '90000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'valid-room-12345','audio',now()+interval '1 minute'
 );
 begin
  insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
  values ('90000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','direct-room-12345','audio','pending',now()+interval '1 minute');
  raise exception 'direct_call_session_insert_allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.start_call_session(
   '90000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001',
   'suspended-room-123','audio',now()+interval '1 minute'
  );
  raise exception 'suspended_callee_call_insert_allowed';
 exception when others then if sqlerrm='suspended_callee_call_insert_allowed' then raise; end if; end;
 insert into public.rendez_vous(de,a,quand,lieu,message,statut)
 values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',now()+interval '1 day','Public place','Meet','attente');
 begin
  insert into public.rendez_vous(de,a,quand,lieu,message,statut)
  values ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',now()+interval '1 day','Public place','Meet','attente');
  raise exception 'suspended_recipient_appointment_allowed';
 exception when others then if sqlerrm='suspended_recipient_appointment_allowed' then raise; end if; end;
end $call$;
reset role;
update private.call_provider_config set enabled=false, updated_at=now() where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $blockedaccept$
begin
  begin
    update public.call_sessions set status='accepted'
    where id='90000000-0000-0000-0000-000000000001' and callee_id=auth.uid();
    raise exception 'disabled_provider_acceptance_allowed';
  exception when insufficient_privilege then null;
  end;
end
$blockedaccept$;
reset role;
update private.call_provider_config set enabled=true, updated_at=now() where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $accepted$ begin
 if (select count(*) from public.call_sessions)<>1 then raise exception 'callee_cannot_read_call'; end if;
 if has_column_privilege('authenticated','public.call_sessions','caller_id','UPDATE')
    or has_column_privilege('authenticated','public.call_sessions','callee_id','UPDATE')
    or has_column_privilege('authenticated','public.call_sessions','room','UPDATE')
    or has_column_privilege('authenticated','public.call_sessions','expires_at','UPDATE')
    or has_column_privilege('authenticated','public.call_sessions','mode','UPDATE') then
   raise exception 'call_session_identity_or_expiry_mutable';
 end if;
 if not has_column_privilege('authenticated','public.call_sessions','status','UPDATE') then
   raise exception 'call_session_status_update_missing';
 end if;
 update public.call_sessions set status='accepted' where id='90000000-0000-0000-0000-000000000001' and callee_id=auth.uid();
 if not exists(select 1 from public.call_sessions where status='accepted') then raise exception 'callee_status_update_failed'; end if;
 if (select count(*) from public.rendez_vous)<>1 then raise exception 'invitee_cannot_read_appointment'; end if;
 update public.rendez_vous set statut='confirme' where a=auth.uid();
 if not exists(select 1 from public.rendez_vous where statut='confirme') then raise exception 'appointment_status_update_failed'; end if;
 if has_column_privilege('authenticated','public.rendez_vous','de','UPDATE') then raise exception 'appointment_sender_column_mutable'; end if;
end $accepted$;
reset role;
insert into public.blocages values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.call_sessions) then raise exception 'blocked_call_session_visible'; end if;
 if exists(select 1 from public.rendez_vous) then raise exception 'blocked_appointment_visible'; end if;
end $$;
reset role;
rollback;
