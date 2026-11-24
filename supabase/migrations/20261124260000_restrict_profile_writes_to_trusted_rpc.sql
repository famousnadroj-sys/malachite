-- Close direct table-write paths that bypass save_my_profile's server-side 18+ checks.
-- Keep only the two narrow profile updates still used by the web client:
-- avatar and derniere_vue. All identity/profile/private-field writes go through
-- trusted SECURITY DEFINER RPCs with auth.uid() checks and an empty search_path.

alter function public.save_my_profile(jsonb, jsonb) security definer;
alter function public.save_my_profile(jsonb, jsonb) set search_path to '';

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (avatar, derniere_vue) on table public.profiles to authenticated;

revoke all on table public.prives from public, anon, authenticated;
grant select on table public.prives to authenticated;

revoke all on table public.login_names from public, anon, authenticated;
grant select on table public.login_names to authenticated;

create or replace function public.update_my_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $malachite_preferences$
declare
  v_uid uuid := auth.uid();
  v_prefs jsonb;
  v_amin integer;
  v_amax integer;
  v_key text;
begin
  if v_uid is null then
    raise exception 'Authentification requise';
  end if;

  if p_preferences is null or jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Préférences invalides';
  end if;

  if (p_preferences - array['genre','amin','amax','communes','ints','rel','desc']::text[]) <> '{}'::jsonb then
    raise exception 'Champ de préférence non autorisé';
  end if;

  if p_preferences ? 'genre' and coalesce(p_preferences->>'genre','') not in ('','H','F') then
    raise exception 'Préférence de genre invalide';
  end if;

  if p_preferences ? 'amin' then
    if jsonb_typeof(p_preferences->'amin') <> 'number' then
      raise exception 'Âge minimum invalide';
    end if;
    v_amin := (p_preferences->>'amin')::integer;
    if v_amin < 18 or v_amin > 100 then
      raise exception 'Âge minimum autorisé : 18 à 100 ans';
    end if;
  end if;

  if p_preferences ? 'amax' then
    if jsonb_typeof(p_preferences->'amax') <> 'number' then
      raise exception 'Âge maximum invalide';
    end if;
    v_amax := (p_preferences->>'amax')::integer;
    if v_amax < 18 or v_amax > 100 then
      raise exception 'Âge maximum autorisé : 18 à 100 ans';
    end if;
  end if;

  if p_preferences ? 'amin' and p_preferences ? 'amax' and v_amin > v_amax then
    raise exception 'La tranche d’âge est invalide';
  end if;

  foreach v_key in array array['communes','ints','rel'] loop
    if p_preferences ? v_key then
      if jsonb_typeof(p_preferences->v_key) <> 'array'
         or jsonb_array_length(p_preferences->v_key) > 20
         or exists (
           select 1
           from jsonb_array_elements(p_preferences->v_key) item(value)
           where jsonb_typeof(item.value) <> 'string'
              or length(item.value #>> '{}') not between 1 and 60
         ) then
        raise exception 'Liste de préférence invalide';
      end if;
    end if;
  end loop;

  if p_preferences ? 'desc' then
    if jsonb_typeof(p_preferences->'desc') <> 'string'
       or length(p_preferences->>'desc') > 300 then
      raise exception 'Description de préférence invalide';
    end if;
  end if;

  update public.prives
  set prefs = coalesce(prefs, '{}'::jsonb) || p_preferences
  where id = v_uid
  returning prefs into v_prefs;

  if not found then
    raise exception 'Profil privé introuvable';
  end if;

  return v_prefs;
end;
$malachite_preferences$;

revoke all on function public.update_my_preferences(jsonb) from public, anon;
grant execute on function public.update_my_preferences(jsonb) to authenticated;

-- save_my_profile is the sole trusted write path for profile identity and private fields.
revoke all on function public.save_my_profile(jsonb, jsonb) from public, anon;
grant execute on function public.save_my_profile(jsonb, jsonb) to authenticated;
