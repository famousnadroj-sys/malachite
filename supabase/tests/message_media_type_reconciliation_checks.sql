begin;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);

-- Supported authenticated media formats remain accepted.
insert into public.messages(de,a,texte,media_type,media_url) values
 ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','document test','document','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/document-1.pdf'),
 ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','image test','image','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/photo-1.jpg');

do $checks$
begin
 if exists(select 1 from public.messages where texte='legacy existing call link' and (media_url is not null or media_type is not null)) then
  raise exception 'existing_public_jitsi_link_was_not_redacted';
 end if;
 if not exists(select 1 from public.messages where texte='legacy existing call link' and media_url is null and media_type is null) then
  raise exception 'legacy_call_message_history_was_not_preserved';
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.messages'::regclass and tgname='trg_limite' and not tgisinternal) then
  raise exception 'message_guard_insert_trigger_must_be_installed';
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.messages'::regclass and tgname='zz_reject_legacy_public_call_links' and not tgisinternal) then
  raise exception 'legacy_public_call_link_guard_must_be_installed';
 end if;
 if (select count(*) from public.messages where media_type in ('document','image')) <> 2 then
  raise exception 'supported_media_types_must_be_accepted';
 end if;
 begin
  insert into public.messages(de,a,texte,media_type,media_url) values
   ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','legacy public call','call','https://meet.jit.si/Malachite0123456789abcdef0123');
  raise exception 'legacy_public_jitsi_link_must_be_rejected';
 exception when others then
  if sqlerrm='legacy_public_jitsi_link_must_be_rejected' then raise; end if;
  if sqlerrm<>'legacy_public_call_links_disabled' then raise; end if;
 end;
 begin
  insert into public.messages(de,a,texte,media_type,media_url) values
   ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','forged document','document','70000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/forged.pdf');
  raise exception 'forged_document_path_must_be_rejected';
 exception when others then
  if sqlerrm='forged_document_path_must_be_rejected' then raise; end if;
  if sqlerrm<>'media_invalide' then raise; end if;
 end;
 begin
  insert into public.messages(de,a,texte,media_type,media_url) values
   ('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','unknown media','spreadsheet','50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/file.xlsx');
  raise exception 'unknown_media_type_must_be_rejected';
 exception when others then
  if sqlerrm='unknown_media_type_must_be_rejected' then raise; end if;
  if sqlerrm<>'media_invalide' then raise; end if;
 end;
end
$checks$;
rollback;
