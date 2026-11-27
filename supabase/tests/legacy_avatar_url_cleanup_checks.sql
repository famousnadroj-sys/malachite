do $test$
begin
 if exists(select 1 from public.profiles where id='70000000-0000-0000-0000-000000000001' and avatar ? 'imageUrl') then
  raise exception 'expired_signed_avatar_url_not_removed';
 end if;
 if (select avatar->>'imagePath' from public.profiles where id='70000000-0000-0000-0000-000000000001')
    is distinct from '70000000-0000-0000-0000-000000000001/avatar-1.png' then
  raise exception 'durable_avatar_path_must_be_preserved';
 end if;
 if not exists(select 1 from public.profiles where id='70000000-0000-0000-0000-000000000002' and avatar ? 'imagePath') then
  raise exception 'clean_avatar_record_must_be_unchanged';
 end if;
 if not exists(select 1 from public.profiles where id='70000000-0000-0000-0000-000000000003' and avatar->>'imageUrl'='https://cdn.example.test/avatar.png') then
  raise exception 'non_storage_avatar_url_must_be_unchanged';
 end if;
end
$test$;
