create or replace function public.save_my_profile(p_profile jsonb, p_private jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
 v_uid uuid := auth.uid();
 v_profile public.profiles;
 v_username text := nullif(lower(trim(coalesce(p_profile->>'username',''))),'');
 v_avatar jsonb;
begin
 if v_uid is null then raise exception 'Authentification requise'; end if;
 if nullif(p_profile->>'id','')::uuid is distinct from v_uid then raise exception 'Profil non autorisé'; end if;
 if coalesce(nullif(p_profile->>'prenom',''),'') = '' then raise exception 'Le prénom est obligatoire'; end if;
 if v_username is not null and v_username !~ '^[a-z0-9_]{3,24}$' then raise exception 'Nom d’utilisateur invalide'; end if;
 if nullif(p_private->>'profile_age','') is not null and (p_private->>'profile_age')::integer < 18 then raise exception 'Âge minimum : 18 ans'; end if;
 if p_profile ? 'avatar' then
  if jsonb_typeof(p_profile->'avatar') <> 'object' then raise exception 'Format d’avatar invalide'; end if;
  if octet_length((p_profile->'avatar')::text) > 8192 then raise exception 'Configuration de l’avatar trop volumineuse'; end if;
  v_avatar := p_profile->'avatar';
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
