-- Preserve the full validated profile RPC from the ACL cutover. This later
-- migration intentionally reasserts the robust implementation; it must not
-- downgrade avatar validation or private-age consistency checks.
create or replace function public.save_my_profile(p_profile jsonb, p_private jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 v_uid uuid := auth.uid();
 v_profile public.profiles;
 v_username text := nullif(lower(trim(coalesce(p_profile->>'username',''))),'');
 v_avatar jsonb;
 v_profile_age_text text := nullif(trim(coalesce(p_private->>'profile_age','')),'');
 v_profile_age integer;
 v_public_age_text text := nullif(trim(coalesce(p_profile->>'age','')),'');
 v_is_private boolean := coalesce((p_profile->>'profile_private')::boolean,false);
begin
 if v_uid is null then raise exception 'Authentification requise'; end if;
 if nullif(p_profile->>'id','')::uuid is distinct from v_uid then raise exception 'Profil non autorisé'; end if;
 if nullif(p_profile->>'prenom','') is null then raise exception 'Le prénom est obligatoire'; end if;
 if v_username is not null and v_username !~ ('^[a-z0-9_]{3,24}' || chr(36)) then raise exception 'Nom d’utilisateur invalide'; end if;
 -- Always require an integer age from 18 to 100 in the owner-only record.
 if v_profile_age_text is null
    or length(v_profile_age_text) not between 1 and 3
    or v_profile_age_text ~ '[^0-9]' then
  raise exception 'Âge obligatoire : 18 à 100 ans';
 end if;
 v_profile_age := v_profile_age_text::integer;
 if v_profile_age < 18 or v_profile_age > 100 then
  raise exception 'Âge minimum : 18 ans (maximum 100 ans)';
 end if;

 -- Public profiles expose the same validated age; private profiles keep it
 -- exclusively in the owner-only record.
 if not v_is_private and v_public_age_text is null then
  raise exception 'Âge obligatoire sur un profil public';
 end if;
 if v_public_age_text is not null then
  if length(v_public_age_text) not between 1 and 3
     or v_public_age_text ~ '[^0-9]'
     or v_public_age_text::integer <> v_profile_age then
   raise exception 'Les informations d’âge ne correspondent pas';
  end if;
 end if;

 if p_profile ? 'avatar' then
  if jsonb_typeof(p_profile->'avatar') is distinct from 'object' or octet_length((p_profile->'avatar')::text) > 8192 then
   raise exception 'Format d’avatar invalide';
  end if;
  v_avatar := p_profile->'avatar';
  if v_avatar = '{}'::jsonb then
   null;
  elsif v_avatar->>'type' = 'pro-vector' then
   if v_avatar->>'version' is distinct from '3'
      or jsonb_typeof(v_avatar->'config') is distinct from 'object'
      or (v_avatar - array['type','version','config']::text[]) <> '{}'::jsonb then
    raise exception 'Avatar vectoriel invalide';
   end if;
  elsif v_avatar->>'type' = 'humanforge-3d' then
   -- imageUrl is a short-lived signed URL and must never be persisted.
   v_avatar := v_avatar - 'imageUrl';
   if v_avatar->>'version' is distinct from '1'
      or jsonb_typeof(v_avatar->'config') is distinct from 'object'
      or coalesce(v_avatar->>'imagePath','') !~ ('^' || v_uid::text || '/avatar-[0-9]+[.]png' || chr(36))
      or (v_avatar - array['type','version','config','imagePath']::text[]) <> '{}'::jsonb then
    raise exception 'Avatar 3D invalide';
   end if;
  else
   raise exception 'Type d’avatar non autorisé';
  end if;
 end if;

 insert into public.prives(id,nom_complet,adresse,telephone,prefs)
 values(v_uid,p_private->>'nom_complet',p_private->>'adresse',p_private->>'telephone',coalesce(p_private->'prefs','{}'::jsonb))
 on conflict(id) do update set nom_complet=excluded.nom_complet,adresse=excluded.adresse,telephone=excluded.telephone,prefs=excluded.prefs;

 if v_username is not null then
  insert into public.login_names(user_id,username) values(v_uid,v_username)
  on conflict(user_id) do update set username=excluded.username;
 end if;

 insert into public.profiles(id,username,prenom,age,genre,commune,quartier,profession,bio,interets,photos,prompts,profile_private,avatar)
 values(v_uid,v_username,p_profile->>'prenom',nullif(p_profile->>'age','')::integer,p_profile->>'genre',p_profile->>'commune',p_profile->>'quartier',p_profile->>'profession',p_profile->>'bio',
 case when jsonb_typeof(p_profile->'interets')='array' then array(select jsonb_array_elements_text(p_profile->'interets')) else '{}'::text[] end,
 case when jsonb_typeof(p_profile->'photos')='array' then array(select jsonb_array_elements_text(p_profile->'photos')) else '{}'::text[] end,
 coalesce(p_profile->'prompts','[]'::jsonb),coalesce((p_profile->>'profile_private')::boolean,false),coalesce(v_avatar,'{}'::jsonb))
 on conflict(id) do update set username=coalesce(excluded.username,public.profiles.username),prenom=excluded.prenom,age=excluded.age,genre=excluded.genre,commune=excluded.commune,quartier=excluded.quartier,profession=excluded.profession,bio=excluded.bio,interets=excluded.interets,photos=excluded.photos,prompts=excluded.prompts,profile_private=excluded.profile_private,avatar=case when p_profile ? 'avatar' then excluded.avatar else public.profiles.avatar end
 returning * into v_profile;
 return to_jsonb(v_profile);
end;
$function$;

revoke all on function public.save_my_profile(jsonb,jsonb) from public, anon;
grant execute on function public.save_my_profile(jsonb,jsonb) to authenticated;
