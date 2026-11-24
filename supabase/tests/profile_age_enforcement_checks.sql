begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

do $missing_age$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":null,"profile_private":true}'::jsonb,
   '{"profile_age":null}'::jsonb
  );
  raise exception 'missing_age_was_accepted';
 exception when others then
  if sqlerrm = 'missing_age_was_accepted' then raise; end if;
 end;
end
$missing_age$;

do $underage$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":17,"profile_private":false}'::jsonb,
   '{"profile_age":17}'::jsonb
  );
  raise exception 'underage_profile_was_accepted';
 exception when others then
  if sqlerrm = 'underage_profile_was_accepted' then raise; end if;
 end;
end
$underage$;

do $mismatch$
begin
 begin
  perform public.save_my_profile(
   '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Test","age":25,"profile_private":false}'::jsonb,
   '{"profile_age":26}'::jsonb
  );
  raise exception 'mismatched_age_was_accepted';
 exception when others then
  if sqlerrm = 'mismatched_age_was_accepted' then raise; end if;
 end;
end
$mismatch$;

do $public_adult$
declare result jsonb;
begin
 result := public.save_my_profile(
  '{"id":"10000000-0000-0000-0000-000000000001","prenom":"Public","age":18,"profile_private":false}'::jsonb,
  '{"profile_age":18}'::jsonb
 );
 if result->>'age' <> '18' then raise exception 'valid_public_adult_age_not_saved'; end if;
end
$public_adult$;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $private_adult$
declare result jsonb;
begin
 result := public.save_my_profile(
  '{"id":"20000000-0000-0000-0000-000000000001","prenom":"Private","age":null,"profile_private":true}'::jsonb,
  '{"profile_age":100}'::jsonb
 );
 if result->>'age' is not null or result->>'profile_private' <> 'true' then
  raise exception 'valid_private_adult_profile_not_saved';
 end if;
end
$private_adult$;

reset role;
rollback;
