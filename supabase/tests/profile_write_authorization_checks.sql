begin;

insert into auth.users(id) values
 ('30000000-0000-0000-0000-000000000001'),
 ('40000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);

do $privileges$
begin
  if has_table_privilege('authenticated','public.profiles','INSERT')
     or has_table_privilege('authenticated','public.profiles','DELETE')
     or has_column_privilege('authenticated','public.profiles','age','UPDATE')
     or has_column_privilege('authenticated','public.profiles','profile_private','UPDATE')
     or has_column_privilege('authenticated','public.profiles','photos','UPDATE') then
    raise exception 'direct_profile_identity_write_still_granted';
  end if;

  if not has_column_privilege('authenticated','public.profiles','avatar','UPDATE')
     or not has_column_privilege('authenticated','public.profiles','derniere_vue','UPDATE') then
    raise exception 'narrow_profile_client_updates_missing';
  end if;

  if has_table_privilege('authenticated','public.prives','INSERT')
     or has_table_privilege('authenticated','public.prives','UPDATE')
     or has_table_privilege('authenticated','public.prives','DELETE')
     or has_table_privilege('authenticated','public.login_names','INSERT')
     or has_table_privilege('authenticated','public.login_names','UPDATE')
     or has_table_privilege('authenticated','public.login_names','DELETE') then
    raise exception 'direct_private_or_login_write_still_granted';
  end if;

  if not has_function_privilege('authenticated','public.save_my_profile(jsonb,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.save_my_profile(jsonb,jsonb)','EXECUTE')
     or not has_function_privilege('authenticated','public.update_my_preferences(jsonb)','EXECUTE')
     or has_function_privilege('anon','public.update_my_preferences(jsonb)','EXECUTE') then
    raise exception 'trusted_rpc_execute_grants_invalid';
  end if;
end
$privileges$;

-- The trusted RPC must still be able to create all profile rows after direct
-- authenticated INSERT/UPDATE privileges have been revoked.
select public.save_my_profile(
  '{"id":"30000000-0000-0000-0000-000000000001","username":"adult_user","prenom":"Adulte","age":25,"profile_private":false,"avatar":{}}'::jsonb,
  '{"nom_complet":"Adulte","profile_age":25,"prefs":{"profile_private":{"age":25,"bio":"privé"}}}'::jsonb
);

do $direct_profile_update$
begin
  begin
    update public.profiles set age=17
    where id='30000000-0000-0000-0000-000000000001';
    raise exception 'direct_age_update_was_accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.prives set prefs='{"profile_private":{"age":16}}'::jsonb
    where id='30000000-0000-0000-0000-000000000001';
    raise exception 'direct_private_preferences_update_was_accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.login_names(user_id,username)
    values('30000000-0000-0000-0000-000000000001','bypass_user');
    raise exception 'direct_login_name_insert_was_accepted';
  exception when insufficient_privilege then
    null;
  end;
end
$direct_profile_update$;

-- Avatar and last-seen are the only direct profile updates retained for the
-- existing frontend. They cannot change age, privacy or personal fields.
update public.profiles
set avatar='{"kind":"test"}'::jsonb,
    derniere_vue=now()
where id='30000000-0000-0000-0000-000000000001';

do $narrow_update$
begin
  if not exists (
    select 1 from public.profiles
    where id='30000000-0000-0000-0000-000000000001'
      and age=25 and avatar='{"kind":"test"}'::jsonb
      and derniere_vue is not null
  ) then
    raise exception 'narrow_avatar_presence_update_failed';
  end if;
end
$narrow_update$;

-- Preference updates accept only the discovery preference allowlist and merge
-- it into the existing JSON without overwriting private profile fields.
select public.update_my_preferences(
  '{"genre":"F","amin":20,"amax":45,"communes":["Lubumbashi"],"ints":["Musique"],"rel":["Relation sérieuse"],"desc":"Profil sérieux"}'::jsonb
);

do $preference_checks$
declare current_prefs jsonb;
begin
  select prefs into current_prefs from public.prives
  where id='30000000-0000-0000-0000-000000000001';

  if current_prefs->>'amin' <> '20'
     or current_prefs->'profile_private'->>'age' <> '25'
     or current_prefs->'profile_private'->>'bio' <> 'privé' then
    raise exception 'preference_update_overwrote_private_profile_data';
  end if;

  begin
    perform public.update_my_preferences('{"profile_private":{"age":16}}'::jsonb);
    raise exception 'private_profile_fields_accepted_by_preferences_rpc';
  exception when others then
    if sqlerrm = 'private_profile_fields_accepted_by_preferences_rpc' then raise; end if;
    if sqlerrm <> 'Champ de préférence non autorisé' then
      raise exception 'unexpected_private_preference_error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.update_my_preferences('{"amin":17,"amax":40}'::jsonb);
    raise exception 'underage_preference_was_accepted';
  exception when others then
    if sqlerrm = 'underage_preference_was_accepted' then raise; end if;
    if sqlerrm <> 'Âge minimum autorisé : 18 à 100 ans' then
      raise exception 'unexpected_underage_preference_error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.update_my_preferences('{"amin":50}'::jsonb);
    raise exception 'partial_age_range_bypass_was_accepted';
  exception when others then
    if sqlerrm = 'partial_age_range_bypass_was_accepted' then raise; end if;
    if sqlerrm <> 'La tranche d’âge est invalide' then
      raise exception 'unexpected_partial_age_range_error: %', sqlerrm;
    end if;
  end;
end
$preference_checks$;

reset role;
rollback;
