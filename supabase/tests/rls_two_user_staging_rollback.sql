-- STAGING ONLY. Never execute against production.
-- Creates disposable auth/profile/block rows inside a transaction and rolls them back.
-- Tests that one member cannot inspect or create another member's blocks, and that
-- a blocked member cannot read the blocker's profile through the authenticated API.

begin;

insert into auth.users(
  id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
  raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous
) values
  ('e6b01c19-29bb-4c2c-8a8f-110000000001','authenticated','authenticated','rls-mal-a-20261123@example.invalid','',now(),now(),now(),'{"provider":"email","providers":["email"]}','{"prenom":"TestA"}',false,false),
  ('e6b01c19-29bb-4c2c-8a8f-110000000002','authenticated','authenticated','rls-mal-b-20261123@example.invalid','',now(),now(),now(),'{"provider":"email","providers":["email"]}','{"prenom":"TestB"}',false,false),
  ('e6b01c19-29bb-4c2c-8a8f-110000000003','authenticated','authenticated','rls-mal-c-20261123@example.invalid','',now(),now(),now(),'{"provider":"email","providers":["email"]}','{"prenom":"TestC"}',false,false);

insert into public.profiles(id,prenom,age,avatar,profile_private,username)
values
  ('e6b01c19-29bb-4c2c-8a8f-110000000001','RLS Test A',25,'{}',false,'rls_test_a_20261123'),
  ('e6b01c19-29bb-4c2c-8a8f-110000000002','RLS Test B',25,'{}',false,'rls_test_b_20261123'),
  ('e6b01c19-29bb-4c2c-8a8f-110000000003','RLS Test C',25,'{}',false,'rls_test_c_20261123');

insert into public.blocages(user_id,cible)
values ('e6b01c19-29bb-4c2c-8a8f-110000000001','e6b01c19-29bb-4c2c-8a8f-110000000002');

set local role authenticated;
set local request.jwt.claim.sub = 'e6b01c19-29bb-4c2c-8a8f-110000000002';

do $test$
declare v_count integer;
begin
  if auth.uid() <> 'e6b01c19-29bb-4c2c-8a8f-110000000002'::uuid then
    raise exception 'test_auth_uid_not_applied';
  end if;

  select count(user_id) into v_count
  from public.blocages
  where user_id='e6b01c19-29bb-4c2c-8a8f-110000000001';
  if v_count <> 0 then raise exception 'cross_member_block_read_allowed'; end if;

  select count(id) into v_count
  from public.profiles
  where id='e6b01c19-29bb-4c2c-8a8f-110000000001';
  if v_count <> 0 then raise exception 'blocked_profile_read_allowed'; end if;

  begin
    insert into public.blocages(user_id,cible)
    values ('e6b01c19-29bb-4c2c-8a8f-110000000001','e6b01c19-29bb-4c2c-8a8f-110000000003');
    raise exception 'cross_member_block_insert_allowed';
  exception when insufficient_privilege then
    null;
  end;
end
$test$;

set local request.jwt.claim.sub = 'e6b01c19-29bb-4c2c-8a8f-110000000001';

do $test$
declare v_count integer;
begin
  select count(user_id) into v_count
  from public.blocages
  where user_id='e6b01c19-29bb-4c2c-8a8f-110000000001';
  if v_count <> 1 then raise exception 'owner_cannot_read_own_block'; end if;
end
$test$;

reset role;
rollback;
