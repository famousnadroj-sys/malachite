-- Retire MALACHITE advertising surfaces without deleting historical records.
-- Campaign buckets were verified empty before this migration was prepared.
-- If objects are later added, this migration preserves them but removes client access.

begin;

update storage.buckets
set public = false
where id in ('malachite-campaigns', 'malachite-campaign-media');

drop policy if exists campagnes_public_read_active on public.campagnes;
drop policy if exists campagnes_admin_select on public.campagnes;
drop policy if exists campagnes_admin_insert on public.campagnes;
drop policy if exists campagnes_admin_update on public.campagnes;
drop policy if exists campagnes_admin_delete on public.campagnes;

drop policy if exists malachite_campaign_images_public_read on storage.objects;
drop policy if exists malachite_campaign_images_admin_insert on storage.objects;
drop policy if exists malachite_campaign_images_admin_update on storage.objects;
drop policy if exists malachite_campaign_images_admin_delete on storage.objects;

drop policy if exists malachite_campaign_media_public_read on storage.objects;
drop policy if exists malachite_campaign_media_admin_insert on storage.objects;
drop policy if exists malachite_campaign_media_admin_update on storage.objects;
drop policy if exists malachite_campaign_media_admin_delete on storage.objects;

commit;
