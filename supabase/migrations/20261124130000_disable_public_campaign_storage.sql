-- MALACHITE launches without advertising or sponsored campaigns.
-- Keep historical campaign records and files intact, but prevent public reads
-- from the legacy campaign media buckets. No objects are deleted.
begin;

update storage.buckets
set public = false
where id in ('malachite-campaigns','malachite-campaign-media');

drop policy if exists malachite_campaign_images_public_read on storage.objects;
drop policy if exists "malachite_campaign_media_public_read" on storage.objects;

commit;
