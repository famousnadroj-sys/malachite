begin;
insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('90000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Malachite-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','audio','pending',now()+interval '2 minutes'),
 ('90000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','Malachite-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','video','pending',now()+interval '2 minutes');

do $$
begin
 if not (select relrowsecurity from pg_class where oid='private.call_provider_config'::regclass) then
   raise exception 'private_call_provider_config_rls_must_be_enabled';
 end if;
 if has_table_privilege('anon','private.call_provider_config','select')
    or has_table_privilege('authenticated','private.call_provider_config','select')
    or has_table_privilege('anon','private.call_provider_config','update')
    or has_table_privilege('authenticated','private.call_provider_config','update') then
   raise exception 'private_call_provider_config_must_not_be_client_accessible';
 end if;
 if has_function_privilege('anon','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE')
    or has_function_privilege('authenticated','public.start_call_session(uuid,uuid,text,text,timestamp with time zone)','EXECUTE') then
   raise exception 'call_creation_rpc_must_not_be_executable_by_clients';
 end if;
 if not has_function_privilege('authenticated','public.update_my_call_session_status(uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.update_my_call_session_status(uuid,text)','EXECUTE') then
   raise exception 'participant_transition_rpc_grants_are_invalid';
 end if;
end
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $$
begin
 begin
  update public.call_sessions set status='accepted' where id='90000000-0000-0000-0000-000000000001';
  raise exception 'direct_call_session_update_must_be_denied';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.update_my_call_session_status('90000000-0000-0000-0000-000000000001','accepted');
  raise exception 'accept_must_wait_for_authenticated_provider';
 exception when others then
  if sqlerrm <> 'secure_call_provider_unavailable' then raise; end if;
 end;
end
$$;
reset role;

-- Sales and validation of paid call passes stay closed while the provider is disabled.
update private.call_provider_config set enabled=false where singleton=true;
do $payments$
begin
 begin
  insert into public.paiements(offre,statut) values ('Appels','attente');
  raise exception 'call_pass_submission_must_be_blocked';
 exception when sqlstate '55000' then
  if sqlerrm <> 'secure_call_provider_not_configured' then raise; end if;
 end;
end
$payments$;
update private.call_provider_config set enabled=true where singleton=true;
insert into public.paiements(offre,statut) values ('Appels','attente');
update private.call_provider_config set enabled=false where singleton=true;
do $validation$
begin
 begin
  update public.paiements set statut='valide' where offre='Appels';
  raise exception 'call_pass_validation_must_be_blocked';
 exception when sqlstate '55000' then
  if sqlerrm <> 'secure_call_provider_not_configured' then raise; end if;
 end;
end
$validation$;

update private.call_provider_config set enabled=true where singleton=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
select public.update_my_call_session_status('90000000-0000-0000-0000-000000000001','accepted');
reset role;
do $check$ begin
 if not public.call_session_token_eligible('90000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001') then raise exception 'eligible_participant_token_check_failed'; end if;
 if public.call_session_token_eligible('90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001') then raise exception 'non_participant_token_check_must_fail'; end if;
 insert into public.blocages(user_id,cible) values ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001');
 if public.call_session_token_eligible('90000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001') then raise exception 'blocked_participant_token_must_fail'; end if;
 delete from public.blocages;
 insert into public.suspensions(user_id) values ('50000000-0000-0000-0000-000000000001');
 if public.call_session_token_eligible('90000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001') then raise exception 'suspended_participant_token_must_fail'; end if;
 delete from public.suspensions;
end $check$;
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
select public.update_my_call_session_status('90000000-0000-0000-0000-000000000001','ended');
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
select public.update_my_call_session_status('90000000-0000-0000-0000-000000000002','rejected');
reset role;

do $$
begin
 if (select status from public.call_sessions where id='90000000-0000-0000-0000-000000000001') <> 'ended' then
   raise exception 'valid_call_end_transition_failed';
 end if;
 if (select status from public.call_sessions where id='90000000-0000-0000-0000-000000000002') <> 'rejected' then
   raise exception 'valid_callee_reject_transition_failed';
 end if;
end
$$;
-- A prepaid pass keeps its remaining time while the authenticated provider is unavailable.
insert into public.paiements(offre,statut,entitlement_expires_at)
values ('Appels','valide',now()+interval '2 days');
update private.call_provider_config set enabled=false where singleton=true;
update private.call_provider_config set disabled_since=now()-interval '1 day' where singleton=true;
update private.call_provider_config set enabled=true where singleton=true;
do $pass_time$
begin
 if (select entitlement_expires_at from public.paiements where offre='Appels' and statut='valide' order by created_at desc limit 1) < now()+interval '2 days 23 hours' then
  raise exception 'prepaid_call_pass_time_must_be_preserved_while_provider_disabled';
 end if;
 if (select disabled_since from private.call_provider_config where singleton=true) is not null then
  raise exception 'disabled_since_must_clear_when_provider_reenabled';
 end if;
end
$pass_time$;
rollback;
