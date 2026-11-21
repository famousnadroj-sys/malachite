create table if not exists public.campagnes (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (char_length(titre) between 3 and 90),
  description text not null check (char_length(description) between 5 and 500),
  image_path text not null,
  lien text,
  statut text not null default 'brouillon' check (statut in ('brouillon','active','pause','terminee')),
  debut timestamptz not null default now(),
  fin timestamptz,
  cree_par uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campagnes_dates_valides check (fin is null or fin > debut),
  constraint campagnes_lien_valide check (lien is null or lien ~ '^https?://')
);
create index if not exists campagnes_publication_idx on public.campagnes (statut, debut, fin);
alter table public.campagnes enable row level security;
drop policy if exists campagnes_public_read_active on public.campagnes;
create policy campagnes_public_read_active on public.campagnes
for select to authenticated
using ((statut = 'active' and debut <= now() and (fin is null or fin > now())) or (select private.is_admin()));
drop policy if exists campagnes_admin_insert on public.campagnes;
create policy campagnes_admin_insert on public.campagnes
for insert to authenticated with check ((select private.is_admin()) and cree_par = (select auth.uid()));
drop policy if exists campagnes_admin_update on public.campagnes;
create policy campagnes_admin_update on public.campagnes
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists campagnes_admin_delete on public.campagnes;
create policy campagnes_admin_delete on public.campagnes
for delete to authenticated using ((select private.is_admin()));
grant select, insert, update, delete on public.campagnes to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('malachite-campaigns', 'malachite-campaigns', true, 1572864, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1572864, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists malachite_campaign_images_public_read on storage.objects;
create policy malachite_campaign_images_public_read on storage.objects
for select to public using (bucket_id = 'malachite-campaigns');
drop policy if exists malachite_campaign_images_admin_insert on storage.objects;
create policy malachite_campaign_images_admin_insert on storage.objects
for insert to authenticated with check (bucket_id = 'malachite-campaigns' and (select private.is_admin()));
drop policy if exists malachite_campaign_images_admin_update on storage.objects;
create policy malachite_campaign_images_admin_update on storage.objects
for update to authenticated using (bucket_id = 'malachite-campaigns' and (select private.is_admin()))
with check (bucket_id = 'malachite-campaigns' and (select private.is_admin()));
drop policy if exists malachite_campaign_images_admin_delete on storage.objects;
create policy malachite_campaign_images_admin_delete on storage.objects
for delete to authenticated using (bucket_id = 'malachite-campaigns' and (select private.is_admin()));