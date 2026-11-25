begin;
insert into public.profiles values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001');
insert into public.suspensions values ('30000000-0000-0000-0000-000000000001');
-- Seed legacy full-URL media records as historical rows; current writes use chat-media paths.
alter table public.messages disable trigger trg_limite;
insert into public.messages(de,a,texte,media_url,media_type) values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','legacy active',
  'https://example.supabase.co/storage/v1/object/public/photos/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/legacy.jpg','image'),
 ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','legacy suspended recipient',
  'https://example.supabase.co/storage/v1/object/public/photos/10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/legacy-private.jpg','image');
alter table public.messages enable trigger trg_limite;
insert into storage.objects(bucket_id,name) values
 ('photos','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/legacy.jpg'),
 ('photos','10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/legacy-private.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $body$ begin
 if current_user <> 'authenticated' then raise exception 'chat_test_role_not_authenticated'; end if;
 if not private.is_suspended('30000000-0000-0000-0000-000000000001') then raise exception 'fixture_suspension_lookup_failed'; end if;
 if not (select relrowsecurity from pg_class where oid='public.messages'::regclass) then raise exception 'message_rls_not_enabled'; end if;
 if (select rolbypassrls from pg_roles where rolname=current_user) then raise exception 'authenticated_role_bypasses_rls'; end if;
 if not exists(select 1 from pg_policy where polrelid='public.messages'::regclass and polcmd='r' and pg_get_expr(polqual,polrelid) like '%is_suspended%') then raise exception 'suspension_filter_missing_from_message_policy'; end if;
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
 if (select count(*) from storage.objects where bucket_id='photos') <> 1 then raise exception 'legacy_suspended_media_visible_to_sender'; end if;
 if (select count(*) from public.messages) <> 2 then raise exception 'sender_can_read_message_to_suspended_member'; end if;
end $body$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $assert$ begin
 if (select count(*) from storage.objects where bucket_id='chat-media') <> 1 then raise exception 'recipient_cannot_read_attached_media'; end if;
 if (select count(*) from storage.objects where bucket_id='photos') <> 1 then raise exception 'recipient_cannot_read_legacy_media'; end if;
 if (select count(*) from public.messages) <> 2 then raise exception 'recipient_can_read_message_to_suspended_member'; end if;
end $assert$;
reset role;
insert into public.blocages values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $assert$ begin
 if exists(select 1 from public.messages) then raise exception 'blocked_message_still_visible'; end if;
 if exists(select 1 from storage.objects where bucket_id='chat-media') then raise exception 'blocked_media_still_visible'; end if;
 if exists(select 1 from storage.objects where bucket_id='photos') then raise exception 'blocked_legacy_media_still_visible'; end if;
end $assert$;
reset role;
rollback;
