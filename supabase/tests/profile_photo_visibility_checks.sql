begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000001');
insert into public.profiles(id,prenom,profile_private,photos) values
 ('10000000-0000-0000-0000-000000000001','Private',true,array['10000000-0000-0000-0000-000000000001/main.jpg']),
 ('20000000-0000-0000-0000-000000000001','Public',false,array['20000000-0000-0000-0000-000000000001/one.jpg','20000000-0000-0000-0000-000000000001/two.jpg']);
insert into storage.objects(bucket_id,name) values
 ('profile-photos','10000000-0000-0000-0000-000000000001/main.jpg'),
 ('profile-photos','10000000-0000-0000-0000-000000000001/hidden.jpg'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/one.jpg'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/two.jpg'),
 ('profile-photos','20000000-0000-0000-0000-000000000001/unlisted.jpg');

set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
-- Print only synthetic fixture paths so a failed visibility assertion is diagnosable.
select name from storage.objects where bucket_id='profile-photos' order by name;
select count(*) as visible_published_photo_count from storage.objects where bucket_id='profile-photos';
do $
declare
 visible_count integer;
begin
 -- A third party must see only the two published images of the public profile.
 select count(*) into visible_count from storage.objects where bucket_id='profile-photos';
 if visible_count <> 2 then
  raise exception 'other_member_must_only_read_published_public_photos; actual_count=%', visible_count;
 end if;
 if exists(select 1 from storage.objects where name='10000000-0000-0000-0000-000000000001/hidden.jpg') then
  raise exception 'private_extra_photo_visible';
 end if;
 if exists(select 1 from storage.objects where name='20000000-0000-0000-0000-000000000001/unlisted.jpg') then
  raise exception 'unlisted_public_photo_visible';
 end if;
end
$$;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
begin
 if (select count(*) from storage.objects where bucket_id='profile-photos' and (storage.foldername(name))[1]='10000000-0000-0000-0000-000000000001') <> 2 then
  raise exception 'owner_must_retain_access_to_all_own_photos';
 end if;
end
$$;
reset role;
rollback;
