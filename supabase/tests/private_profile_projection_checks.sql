begin;

insert into auth.users(id)
values ('40000000-0000-0000-0000-000000000001');

-- Simulate a public profile becoming private through a direct API update.
insert into public.profiles(
 id,prenom,age,genre,commune,quartier,profession,bio,
 interets,photos,prompts,derniere_vue,profile_private
) values (
 '40000000-0000-0000-0000-000000000001','Fixture',27,'F','Lubumbashi','Golf',
 'Test','Private bio',array['hidden-interest'],array['photo-a','photo-b'],
 '[{"q":"secret","a":"secret answer"}]'::jsonb,now(),false
);

update public.profiles
set profile_private=true
where id='40000000-0000-0000-0000-000000000001';

do $$
declare p public.profiles;
begin
 select * into p from public.profiles
 where id='40000000-0000-0000-0000-000000000001';

 if p.age is not null or p.genre is not null or p.commune is not null
    or p.quartier is not null or p.profession is not null or p.bio is not null
    or cardinality(p.interets)<>0 or cardinality(p.photos)<>1
    or jsonb_array_length(p.prompts)<>0 or p.derniere_vue is not null then
  raise exception 'private_profile_public_projection_not_sanitized';
 end if;
end
$$;

-- Switching back to public must not strip fields from a public profile.
update public.profiles
set profile_private=false,age=27,bio='Public bio'
where id='40000000-0000-0000-0000-000000000001';

do $$
begin
 if not exists (
  select 1 from public.profiles
  where id='40000000-0000-0000-0000-000000000001'
    and age=27 and bio='Public bio'
 ) then
  raise exception 'public_profile_projection_broken';
 end if;
end
$$;

rollback;
