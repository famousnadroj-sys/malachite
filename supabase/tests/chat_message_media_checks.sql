begin;
insert into public.profiles values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001');
insert into public.suspensions values ('30000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin
  insert into public.messages(de,a,texte) values ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','suspended recipient');
  raise exception 'suspended_recipient_message_allowed';
 exception when others then
  if sqlerrm='suspended_recipient_message_allowed' then raise; end if;
 end;
 begin
  insert into storage.objects(bucket_id,name) values ('chat-media','10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/file.jpg');
  raise exception 'suspended_recipient_upload_allowed';
 exception when others then
  if sqlerrm='suspended_recipient_upload_allowed' then raise; end if;
 end;
 insert into public.messages(de,a,texte,media_url,media_type) values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','hello','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/photo-a.jpg','image');
 insert into storage.objects(bucket_id,name) values
 ('chat-media','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/photo-a.jpg'),
 ('chat-media','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/orphan.jpg');
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 1 then raise exception 'orphan_media_visible_to_sender'; end if;
 if (select count(*) from public.messages) <> 1 then raise exception 'sender_cannot_read_message'; end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 1 then raise exception 'recipient_cannot_read_attached_media'; end if;
 if (select count(*) from public.messages) <> 1 then raise exception 'recipient_cannot_read_message'; end if;
end $$;
reset role;
insert into public.blocages values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.messages) then raise exception 'blocked_message_still_visible'; end if;
 if exists(select 1 from storage.objects where bucket_id='chat-media') then raise exception 'blocked_media_still_visible'; end if;
end $$;
reset role;
rollback;
