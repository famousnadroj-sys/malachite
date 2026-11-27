-- Reassert the private-profile row and photo visibility boundary when the
-- production migration ledger has drifted. Do not rewrite member profile data.
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
