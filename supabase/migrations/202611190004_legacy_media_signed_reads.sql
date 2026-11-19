drop policy if exists "legacy chat media read participants" on storage.objects;
create policy "legacy chat media read participants"
on storage.objects for select to authenticated
using (
  bucket_id = 'photos'
  and exists (
    select 1
    from public.messages m
    where split_part(m.media_url, '/storage/v1/object/public/photos/', 2) = storage.objects.name
      and (m.de = (select auth.uid()) or m.a = (select auth.uid()))
      and not private.is_blocked_with(
        case when m.de = (select auth.uid()) then m.a else m.de end
      )
  )
);