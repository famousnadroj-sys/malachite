begin;

insert into auth.users(id)
values ('40000000-0000-0000-0000-000000000001');

insert into public.profiles(
 id,prenom,age,genre,commune,quartier,profession,bio,
 interets,photos,prompts,derniere_vue,profile_private
) values (
 '40000000-0000-0000-0000-000000000001','Fixture',27,'F','Lubumbashi','Golf',
 'Test','Private bio',array['hidden-interest'],array['photo-a','photo-b'],
 '[{"q":"secret","a":"secret answer"}]'::jsonb,now(),true
);

-- Another authenticated user must not see the private row.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$
begin
 if exists(select 1 from public.profiles where id='40000000-0000-0000-0000-000000000001') then
  raise exception 'private_profile_visible_to_other_authenticated_user';
 end if;
end
$$;

-- The owner must retain access to the complete profile.
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
do $$
begin
 if not exists(
  select 1 from public.profiles
  where id='40000000-0000-0000-0000-000000000001'
    and age=27 and bio='Private bio'
    and cardinality(photos)=2 and jsonb_array_length(prompts)=1
 ) then
  raise exception 'private_profile_owner_data_missing';
 end if;
end
$$;
reset role;

-- A public profile remains discoverable.
update public.profiles set profile_private=false
where id='40000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$
begin
 if not exists(select 1 from public.profiles where id='40000000-0000-0000-0000-000000000001') then
  raise exception 'public_profile_not_discoverable';
 end if;
end
$$;
reset role;

rollback;
