-- Keep private-profile cards discoverable while exposing only the public projection.
-- The owner's full private fields are retained in public.prives.prefs by save_my_profile.
create or replace function private.enforce_private_profile_public_projection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if new.profile_private then
  new.age := null;
  new.genre := null;
  new.commune := null;
  new.quartier := null;
  new.profession := null;
  new.bio := null;
  new.interets := '{}'::text[];
  new.prompts := '[]'::jsonb;
  new.derniere_vue := null;
  if pg_catalog.cardinality(new.photos) > 1 then
   new.photos := new.photos[1:1];
  end if;
 end if;
 return new;
end
$$;

drop trigger if exists enforce_private_profile_public_projection on public.profiles;
create trigger enforce_private_profile_public_projection
before insert or update on public.profiles
for each row
execute function private.enforce_private_profile_public_projection();
