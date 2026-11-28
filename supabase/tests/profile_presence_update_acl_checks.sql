do $profile_acl$
begin
  if not (select relrowsecurity from pg_class where oid='public.profiles'::regclass) then
    raise exception 'profile_rls_must_remain_enabled';
  end if;
  if not has_table_privilege('authenticated','public.profiles','select') then
    raise exception 'authenticated_profile_read_missing';
  end if;
  if has_table_privilege('authenticated','public.profiles','insert')
     or has_table_privilege('authenticated','public.profiles','update')
     or has_table_privilege('authenticated','public.profiles','delete') then
    raise exception 'profile_table_wide_mutation_must_be_revoked';
  end if;
  if not has_column_privilege('authenticated','public.profiles','derniere_vue','update') then
    raise exception 'profile_presence_update_missing';
  end if;
  if has_column_privilege('authenticated','public.profiles','bio','update') then
    raise exception 'profile_bio_direct_update_must_be_revoked';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
      and policyname='modifier son profil' and cmd='UPDATE'
      and coalesce(qual,'') like '%auth.uid%'
      and coalesce(with_check,'') like '%auth.uid%'
  ) then
    raise exception 'profile_update_must_remain_owner_scoped';
  end if;
end
$profile_acl$;

begin;
insert into public.profiles(id,derniere_vue,bio) values
 ('70000000-0000-0000-0000-000000000011',null,'before-own'),
 ('70000000-0000-0000-0000-000000000012',null,'before-other');
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000011',true);
do $profile_write$
declare v_rows integer;
begin
  update public.profiles set derniere_vue=now()
  where id=(select auth.uid());
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'owner_presence_update_failed'; end if;

  begin
    update public.profiles set bio='must-not-change'
    where id=(select auth.uid());
    raise exception 'direct_profile_bio_update_was_allowed';
  exception when insufficient_privilege then
    null;
  end;

  update public.profiles set derniere_vue=now()
  where id='70000000-0000-0000-0000-000000000012';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'cross_user_presence_update_was_allowed'; end if;
end
$profile_write$;
reset role;
rollback;
