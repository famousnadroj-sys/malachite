-- Private profiles are owner-only. Preserve profile data; do not redact or rewrite member rows.
-- Remove the legacy trigger that nulled profile fields and truncated photo arrays.
drop trigger if exists enforce_private_profile_public_projection on public.profiles;
drop function if exists private.enforce_private_profile_public_projection();

-- A private profile is visible only to its owner. Public profiles still respect
-- both directions of blocking and active suspensions.
drop policy if exists "voir profils" on public.profiles;
create policy "voir profils"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    profile_private = false
    and not private.is_blocked_with(id)
    and not private.is_suspended(id)
  )
);

-- Storage is a separate access surface: never expose any photo from a private
-- profile, including its first photo. Public photos must be listed on the
-- public profile row. Owners retain access to all their own files.
drop policy if exists "profile photos read" on storage.objects;
drop policy if exists "profile photos read published paths" on storage.objects;
create policy "profile photos read published paths"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.profiles p
      where p.id::text = (storage.foldername(objects.name))[1]
        and p.profile_private = false
        and objects.name = any(coalesce(p.photos, '{}'::text[]))
        and not private.is_blocked_with(p.id)
        and not private.is_suspended(p.id)
    )
  )
);
