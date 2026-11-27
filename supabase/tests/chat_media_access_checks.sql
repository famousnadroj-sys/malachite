begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $checks$
begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 1 then
  raise exception 'receiver_must_only_read_media_attached_to_their_message';
 end if;
 if (select count(*) from storage.objects where bucket_id='photos') <> 1 then
  raise exception 'receiver_must_read_only_their_legacy_chat_attachment';
 end if;
end
$checks$;
reset role;

-- The sender must not read a message object stored under a different sender folder.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $sender_path$
begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 1 then
  raise exception 'sender_must_not_read_mismatched_folder_object';
 end if;
end
$sender_path$;
reset role;

-- A hidden/private profile still receives messages through an existing conversation.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $private_profile_chat$
begin
 if exists(select 1 from public.profiles where id='60000000-0000-0000-0000-000000000001') then
  raise exception 'fixture_should_hide_private_profile_from_other_member';
 end if;
 insert into public.messages(id,de,a,media_url) values
  (6,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','private-profile-chat');
end
$private_profile_chat$;
reset role;
do $private_profile_message$
begin
 if not exists(select 1 from public.messages where id=6) then
  raise exception 'private_profile_must_remain_chat_reachable';
 end if;
end
$private_profile_message$;

insert into public.blocages(user_id,cible) values
 ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $blocked$
begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 0 then
  raise exception 'blocked_member_must_not_read_chat_media';
 end if;
 if (select count(*) from storage.objects where bucket_id='photos') <> 0 then
  raise exception 'blocked_member_must_not_read_legacy_chat_media';
 end if;
end
$blocked$;
reset role;
delete from public.blocages;

insert into public.suspensions(user_id) values ('50000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $suspended_sender$
begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 0 then
  raise exception 'suspended_sender_media_must_not_be_readable';
 end if;
 if (select count(*) from storage.objects where bucket_id='photos') <> 0 then
  raise exception 'suspended_sender_legacy_media_must_not_be_readable';
 end if;
 if (select count(*) from public.messages) <> 0 then
  raise exception 'suspended_sender_must_not_read_messages';
 end if;
end
$suspended_sender$;
reset role;
delete from public.suspensions;

insert into public.suspensions(user_id) values ('60000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $suspended_receiver$
begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 0 then
  raise exception 'suspended_receiver_must_not_read_chat_media';
 end if;
 if (select count(*) from storage.objects where bucket_id='photos') <> 0 then
  raise exception 'suspended_receiver_must_not_read_legacy_chat_media';
 end if;
 if (select count(*) from public.messages) <> 0 then
  raise exception 'suspended_receiver_must_not_read_messages';
 end if;
end
$suspended_receiver$;
reset role;

-- A suspended recipient must not receive new messages.
delete from public.suspensions;
insert into public.suspensions(user_id) values ('60000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $attempt_suspended_recipient$
begin
 begin
  insert into public.messages(id,de,a,media_url) values
   (4,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','blocked-suspended-recipient');
 exception when insufficient_privilege then
  return;
 end;
 raise exception 'must_not_send_message_to_suspended_recipient';
end
$attempt_suspended_recipient$;
reset role;
do $suspended_recipient_insert$
begin
 if exists(select 1 from public.messages where id=4) then
  raise exception 'must_not_send_message_to_suspended_recipient';
 end if;
end
$suspended_recipient_insert$;
delete from public.suspensions;

-- A suspended sender must not create new messages either.
insert into public.suspensions(user_id) values ('50000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $attempt_suspended_sender$
begin
 begin
  insert into public.messages(id,de,a,media_url) values
   (5,'50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','blocked-suspended-sender');
 exception when insufficient_privilege then
  return;
 end;
 raise exception 'suspended_sender_must_not_create_messages';
end
$attempt_suspended_sender$;
reset role;
do $suspended_sender_insert$
begin
 if exists(select 1 from public.messages where id=5) then
  raise exception 'suspended_sender_must_not_create_messages';
 end if;
end
$suspended_sender_insert$;

rollback;
