alter table public.campagnes
  add column if not exists media_type text not null default 'image',
  add column if not exists duration_seconds smallint,
  add column if not exists video_path text,
  add column if not exists placement text not null default 'discover_top',
  add column if not exists audio_enabled boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='campagnes_media_type_check') then
    alter table public.campagnes add constraint campagnes_media_type_check check (media_type in ('image','animated','video','notice'));
  end if;
  if not exists (select 1 from pg_constraint where conname='campagnes_duration_check') then
    alter table public.campagnes add constraint campagnes_duration_check check (duration_seconds is null or duration_seconds in (10,15,20));
  end if;
  if not exists (select 1 from pg_constraint where conname='campagnes_placement_check') then
    alter table public.campagnes add constraint campagnes_placement_check check (placement in ('discover_top'));
  end if;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('malachite-campaign-media','malachite-campaign-media',true,20971520,array['video/webm','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "malachite_campaign_media_public_read" on storage.objects;
create policy "malachite_campaign_media_public_read" on storage.objects for select to public using (bucket_id='malachite-campaign-media');
drop policy if exists "malachite_campaign_media_admin_insert" on storage.objects;
create policy "malachite_campaign_media_admin_insert" on storage.objects for insert to authenticated with check (bucket_id='malachite-campaign-media' and private.is_admin());
drop policy if exists "malachite_campaign_media_admin_update" on storage.objects;
create policy "malachite_campaign_media_admin_update" on storage.objects for update to authenticated using (bucket_id='malachite-campaign-media' and private.is_admin()) with check (bucket_id='malachite-campaign-media' and private.is_admin());
drop policy if exists "malachite_campaign_media_admin_delete" on storage.objects;
create policy "malachite_campaign_media_admin_delete" on storage.objects for delete to authenticated using (bucket_id='malachite-campaign-media' and private.is_admin());