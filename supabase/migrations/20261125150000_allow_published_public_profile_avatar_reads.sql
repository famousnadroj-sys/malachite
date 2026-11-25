-- Public humanforge-3d avatars are stored separately from the profile photo list.
-- Permit only the exact avatar imagePath on a public, unblocked, unsuspended profile.
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
        and (
          objects.name = any(coalesce(p.photos, '{}'::text[]))
          or (
            p.avatar->>'type' = 'humanforge-3d'
            and p.avatar->>'imagePath' = objects.name
          )
        )
        and not private.is_blocked_with(p.id)
        and not private.is_suspended(p.id)
    )
  )
);
