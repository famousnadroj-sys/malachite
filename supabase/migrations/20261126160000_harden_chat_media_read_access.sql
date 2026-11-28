-- A chat-media object is readable only when it is attached to a real message
-- between the requesting member and the other participant. Mirror message RLS
-- and re-check blocking/suspension at the storage boundary.
drop policy if exists "chat-media lire" on storage.objects;
create policy "chat-media lire message participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and not private.is_suspended((select auth.uid()))
  and exists (
    select 1
    from public.messages m
    where m.media_url = objects.name
      and (m.de = (select auth.uid()) or m.a = (select auth.uid()))
      and (storage.foldername(objects.name))[1] = m.de::text
      and (storage.foldername(objects.name))[2] = m.a::text
      and not private.is_blocked_with(
        case when m.de = (select auth.uid()) then m.a else m.de end
      )
      and not private.is_suspended(
        case when m.de = (select auth.uid()) then m.a else m.de end
      )
  )
);

-- Legacy chat attachments are still stored in the private "photos" bucket.
-- Reassert that compatibility policy too; otherwise its older permissive rule
-- would remain an independent OR path around the newer chat-media checks.
drop policy if exists "legacy chat media read participants" on storage.objects;
create policy "legacy chat media read participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and exists (
    select 1
    from public.messages m
    where split_part(
      m.media_url,
      '/storage/v1/object/public/photos/',
      2
    ) = objects.name
      and (m.de = (select auth.uid()) or m.a = (select auth.uid()))
      and not private.is_blocked_with(
        case when m.de = (select auth.uid()) then m.a else m.de end
      )
      and not private.is_suspended(m.de)
      and not private.is_suspended(m.a)
  )
);
