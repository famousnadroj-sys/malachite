-- Limit access to profile photos to the owner and the currently published projection.
-- Private profiles expose only their first published photo; unlisted files remain owner-only.
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
   where p.id = ((storage.foldername(name))[1])::uuid
     and not private.is_blocked_with(p.id)
     and (
      (coalesce(p.profile_private,false) = false and name = any(coalesce(p.photos,'{}'::text[])))
      or (p.profile_private = true and name = p.photos[1])
     )
  )
 )
);
