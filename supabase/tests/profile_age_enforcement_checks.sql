begin;
grant update on public.call_sessions to authenticated;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001');

insert into public.call_sessions(id,caller_id,callee_id,room,mode,status,expires_at)
values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Malachite-test-room-0001','audio','pending',now()+interval '2 minutes'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Malachite-test-room-0002','video','pending',now()+interval '2 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

do $missing_age$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":null,"profile_private":true}'::jsonb,
   '{"profile_age":null}'::jsonb
  );
  raise exception 'missing_age_was_accepted';
 exception when others then
  if sqlerrm = 'missing_age_was_accepted' then raise; end if;
 end;
end
$missing_age$;

do $underage$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":17,"profile_private":false}'::jsonb,
   '{"profile_age":17}'::jsonb
  );
  raise exception 'underage_profile_was_accepted';
 exception when others then
  if sqlerrm = 'underage_profile_was_accepted' then raise; end if;
 end;
end
$underage$;

do $mismatch$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":25,"profile_private":false}'::jsonb,
   '{"profile_age":26}'::jsonb
  );
  raise exception 'mismatched_age_was_accepted';
 exception when others then
  if sqlerrm = 'mismatched_age_was_accepted' then raise; end if;
 end;
end
$mismatch$;

do $public_age_missing$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":null,"profile_private":false}'::jsonb,
   '{"profile_age":18}'::jsonb
  );
  raise exception 'public_profile_without_age_was_accepted';
 exception when others then
  if sqlerrm = 'public_profile_without_age_was_accepted' then raise; end if;
 end;
end
$public_age_missing$;

do $public_adult$
declare result jsonb;
begin
 result := public.save_my_profile(
  '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Public","age":18,"profile_private":false}'::jsonb,
  '{"profile_age":18}'::jsonb
 );
 if result->>'age' <> '18' then raise exception 'valid_public_adult_age_not_saved'; end if;
end
$public_adult$;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $private_adult$
declare result jsonb;
begin
 result := public.save_my_profile(
  '{"id":"20000000-0000-0000-0000-000000000001","prenom":"Private","age":null,"profile_private":true}'::jsonb,
  '{"profile_age":100,"prefs":{"profile_private":{"age":100}}}'::jsonb
 );
 if result->>'age' is not null or result->>'profile_private' <> 'true' then
  raise exception 'valid_private_adult_profile_not_saved';
 end if;
 if (select prefs #>> '{profile_private,age}' from public.prives where id='20000000-0000-0000-0000-000000000001') <> '100' then
  raise exception 'private_profile_age_not_saved_in_owner_preferences';
 end if;
end
$private_adult$;


select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

do $secure_preferences$
declare result jsonb;
begin
 result := public.update_my_preferences(
  '{"genre":"F","amin":20,"amax":35,"communes":["Lubumbashi"],"ints":["lecture"],"rel":["Amour"],"desc":"test transactionnel"}'::jsonb
 );
 if result->>'genre' <> 'F' or result->>'amin' <> '20' or result->>'amax' <> '35' then
  raise exception 'valid_preferences_rpc_failed';
 end if;
 begin
  perform public.update_my_preferences('{"admin":true}'::jsonb);
  raise exception 'unapproved_preference_key_was_accepted';
 exception when others then
  if sqlerrm = 'unapproved_preference_key_was_accepted' then raise; end if;
 end;
end
$secure_preferences$;

do $secure_avatar$
declare result jsonb;
begin
 result := public.update_my_avatar(
  '{"type":"pro-vector","version":3,"config":{"gender":"woman"}}'::jsonb
 );
 if result->'avatar'->>'type' <> 'pro-vector' then
  raise exception 'valid_avatar_rpc_failed';
 end if;
 begin
  perform public.update_my_avatar(
   '{"type":"humanforge-3d","version":1,"config":{},"imagePath":"20000000-0000-0000-0000-000000000001/avatar-123.png"}'::jsonb
  );
  raise exception 'foreign_avatar_storage_path_was_accepted';
 exception when others then
  if sqlerrm = 'foreign_avatar_storage_path_was_accepted' then raise; end if;
 end;
end
$secure_avatar$;

do $cross_account$
begin
 begin
  perform public.save_my_profile(
   '{"id":"20000000-0000-0000-0000-000000000001","prenom":"Intrusion","age":25,"profile_private":false}'::jsonb,
   '{"profile_age":25}'::jsonb
  );
  raise exception 'cross_account_profile_write_was_accepted';
 exception when others then
  if sqlerrm = 'cross_account_profile_write_was_accepted' then raise; end if;
 end;
end
$cross_account$;

do $call_identity_guard$
begin
 begin
  update public.call_sessions set callee_id='10000000-0000-0000-0000-000000000001'
  where id='30000000-0000-0000-0000-000000000001';
  raise exception 'call_callee_rewrite_was_accepted';
 exception when others then
  if sqlerrm = 'call_callee_rewrite_was_accepted' then raise; end if;
 end;
 begin
  update public.call_sessions set room='attacker-controlled-room'
  where id='30000000-0000-0000-0000-000000000001';
  raise exception 'call_room_rewrite_was_accepted';
 exception when others then
  if sqlerrm = 'call_room_rewrite_was_accepted' then raise; end if;
 end;
 begin
  update public.call_sessions set status='accepted'
  where id='30000000-0000-0000-0000-000000000001';
  raise exception 'caller_accepted_own_call_was_accepted';
 exception when others then
  if sqlerrm = 'caller_accepted_own_call_was_accepted' then raise; end if;
 end;
end
$call_identity_guard$;

update public.call_sessions set status='expired'
where id='30000000-0000-0000-0000-000000000001';

reset role;
rollback;
