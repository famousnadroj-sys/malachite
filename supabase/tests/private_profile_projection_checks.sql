begin;
insert into auth.users(id) values ('40000000-0000-0000-0000-000000000001');
insert into public.prives(id,prefs) values (
 '40000000-0000-0000-0000-000000000001',
 '{"profile_visibility":{"mode":"private"},"profile_private":{"age":27,"genre":"F","commune":"Lubumbashi","quartier":"Golf","profession":"Test","bio":"Private bio","interets":["hidden-interest"],"photos":["photo-a","photo-b"],"prompts":[{"q":"secret","a":"secret answer"}]}}'::jsonb
);
insert into public.profiles(id,username,prenom,age,genre,commune,quartier,profession,bio,interets,photos,prompts,derniere_vue,profile_private)
values ('40000000-0000-0000-0000-000000000001','private_fixture','Fixture',27,'F','Lubumbashi','Golf','Test','Private bio',array['hidden-interest'],array['photo-a','photo-b'],'[{"q":"secret","a":"secret answer"}]'::jsonb,now(),true);

-- Other members see the profile card, but only its permitted public projection.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$ begin
 if not exists(select 1 from public.profiles where id='40000000-0000-0000-0000-000000000001'
  and prenom='Fixture' and username='private_fixture' and profile_private=true
  and age is null and genre is null and commune is null and quartier is null
  and profession is null and bio is null and cardinality(interets)=0
  and cardinality(photos)=1 and photos[1]='photo-a'
  and jsonb_array_length(prompts)=0 and derniere_vue is null) then
  raise exception 'private_profile_public_projection_invalid';
 end if;
 if exists(select 1 from public.prives where id='40000000-0000-0000-0000-000000000001') then
  raise exception 'private_preferences_visible_to_other_user';
 end if;
end $$;

-- The owner can still read the original private data.
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
do $$ begin
 if not exists(select 1 from public.prives where id='40000000-0000-0000-0000-000000000001'
  and prefs->'profile_private'->>'bio'='Private bio'
  and prefs->'profile_private'->'photos'->>1='photo-b') then
  raise exception 'owner_private_profile_data_missing';
 end if;
end $$;
reset role;

-- Public profiles keep their full visible fields.
update public.profiles set profile_private=false,age=27,bio='Public bio'
where id='40000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
do $$ begin
 if not exists(select 1 from public.profiles where id='40000000-0000-0000-0000-000000000001' and age=27 and bio='Public bio') then
  raise exception 'public_profile_projection_broken';
 end if;
end $$;
reset role;
rollback;
