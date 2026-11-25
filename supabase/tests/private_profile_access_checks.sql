begin;

-- Authenticated profile reads must be explicitly granted and remain filtered by RLS.
do $profile_grant$
begin
  if not has_table_privilege('authenticated','public.profiles','SELECT') then
    raise exception 'authenticated_profile_select_grant_missing';
  end if;
end
$profile_grant$;

-- The migration must remove the legacy data-rewriting trigger.
do $$
begin
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and t.tgname = 'enforce_private_profile_public_projection'
      and not t.tgisinternal
  ) then
    raise exception 'legacy_profile_redaction_trigger_still_installed';
  end if;
end
$$;

insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001'),
 ('40000000-0000-0000-0000-000000000001'),
 ('50000000-0000-0000-0000-000000000001'),
 ('60000000-0000-0000-0000-000000000001');

insert into public.profiles(id,prenom,age,genre,commune,quartier,profession,bio,interets,photos,prompts,derniere_vue,profile_private,avatar) values
 ('10000000-0000-0000-0000-000000000001','Private',27,'F','Lubumbashi','Golf','Designer','Private bio',array['private-interest'],array['10000000-0000-0000-0000-000000000001/main.jpg','10000000-0000-0000-0000-000000000001/extra.jpg'],'[{"q":"secret","a":"answer"}]'::jsonb,now(),true,'{"type":"humanforge-3d","version":1,"config":{},"imagePath":"10000000-0000-0000-0000-000000000001/avatar-3d.png"}'::jsonb),
 ('20000000-0000-0000-0000-000000000001','Public',29,'M','Lubumbashi','Centre','Engineer','Public bio',array['public-interest'],array['20000000-0000-0000-0000-000000000001/one.jpg','20000000-0000-0000-0000-000000000001/two.jpg'],'[]'::jsonb,now(),false,'{"type":"humanforge-3d","version":1,"config":{},"imagePath":"20000000-0000-0000-0000-000000000001/avatar-3d.png"}'::jsonb),
 ('30000000-0000-0000-0000-000000000001','Blocked',30,'M','Lubumbashi','Golf','Test','Blocked bio','{}',array['30000000-0000-0000-0000-000000000001/photo.jpg'],'[]'::jsonb,now(),false),
 ('40000000-0000-0000-0000-000000000001','Suspended',31,'M','Lubumbashi','Golf','Test','Suspended bio','{}',array['40000000-0000-0000-0000-000000000001/photo.jpg'],'[]'::jsonb,now(),false),
 ('60000000-0000-0000-0000-000000000001','Blocker',32,'F','Lubumbashi','Golf','Test','Blocker bio','{}',array['60000000-0000-0000-0000-000000000001/photo.jpg'],'[]'::jsonb,now(),false);

insert into public.blocages(user_id,cible) values
 ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001'),
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001');
insert into public.suspensions(user_id,motif) values
 ('40000000-0000-0000-0000-000000000001','fixture');

insert into storage.objects(bucket_id,name) values
 ('profile-photos','10000000-0000-0000-0000-000000000001/main.jpg'),
 ('profile-photos','10000000-0000-0000-0000-000000000001/extra.jpg'),
 ('profile-photos','10000000-0000-0000-0000-000000000001/avatar-3d.png'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/avatar-3d.png'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/one.jpg'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/two.jpg'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/unlisted.jpg'),
 ('profile-photos','30000000-0000-0000-0000-000000000001/photo.jpg'),
 ('profile-photos','40000000-0000-0000-0000-000000000001/photo.jpg'),
 ('profile-photos','60000000-0000-0000-0000-000000000001/photo.jpg');

-- Reader account: only the public, unblocked, unsuspended profile is visible.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$
begin
  if (select count(*) from public.profiles) <> 1
     or not exists(select 1 from public.profiles where id='20000000-0000-0000-0000-000000000001') then
    raise exception 'private_blocked_or_suspended_profile_visibility_failed';
  end if;
  if exists(select 1 from public.profiles where id in (
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  )) then
    raise exception 'private_blocked_or_suspended_profile_leaked';
  end if;
  if (select count(*) from storage.objects where bucket_id='profile-photos') <> 3 then
    raise exception 'photo_visibility_should_only_include_listed_public_photos';
  end if;
  if exists(select 1 from storage.objects where name like '10000000-%'
       or name like '30000000-%' or name like '40000000-%' or name like '60000000-%'
       or name like '%unlisted.jpg') then
    raise exception 'private_blocked_suspended_or_unlisted_photo_leaked';
  end if;
end
$$;

-- The private profile owner retains every original field and all photos.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
begin
  if not exists(select 1 from public.profiles where id='10000000-0000-0000-0000-000000000001'
    and age=27 and bio='Private bio' and genre='F' and commune='Lubumbashi'
    and quartier='Golf' and profession='Designer'
    and interets=array['private-interest'] and cardinality(photos)=2
    and jsonb_array_length(prompts)=1 and derniere_vue is not null
    and avatar->>'imagePath'='10000000-0000-0000-0000-000000000001/avatar-3d.png') then
    raise exception 'private_profile_owner_data_not_preserved';
  end if;
  if (select count(*) from storage.objects
      where bucket_id='profile-photos'
        and (storage.foldername(objects.name))[1] = '10000000-0000-0000-0000-000000000001') <> 3 then
    raise exception 'private_profile_owner_cannot_read_own_photos';
  end if;
end
$$;

reset role;
rollback;
