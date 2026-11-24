begin;
insert into public.profiles values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001');
insert into public.suspensions values ('30000000-0000-0000-0000-000000000001');
insert into public.statuts values ('10000000-0000-0000-0000-000000000001',now()+interval '1 day');
insert into public.avis_match values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true),
 ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',true),
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $ begin
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
end $;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $$ begin
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
end $$;
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
