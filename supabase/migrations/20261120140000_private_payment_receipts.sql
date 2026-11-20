-- Private payment receipts, strict ownership and duplicate-reference protection.
-- Apply only after staging validation; this migration is not applied to production by this PR.
begin;

alter table public.paiements
  add column if not exists receipt_path text;

alter table public.paiements
  drop constraint if exists paiements_receipt_path_owner_check;
alter table public.paiements
  add constraint paiements_receipt_path_owner_check
  check (
    receipt_path is null
    or (
      char_length(receipt_path) between 1 and 255
      and split_part(receipt_path, '/', 1) = user_id::text
      and receipt_path !~ '(^/|\.\.|//)'
    )
  );

-- A transaction reference must not be submitted twice for the same operator.
create unique index if not exists paiements_operator_reference_uidx
  on public.paiements (operateur, lower(btrim(code)))
  where operateur is not null;

-- Contact unlock requests require a mutual match; UI checks are not authorization.
drop policy if exists "declarer un paiement" on public.paiements;
create policy "declarer un paiement"
on public.paiements
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and statut = 'attente'
  and offre = any (array['Premium','Boost','Badge Vérifié','Contact','Appels'])
  and char_length(btrim(code)) between 4 and 100
  and (
    (offre = 'Contact'
      and cible is not null
      and cible <> (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = paiements.cible)
      and exists (select 1 from public.avis_match a where a.user_id = (select auth.uid()) and a.autre = paiements.cible and a.ok = true)
      and exists (select 1 from public.avis_match a where a.user_id = paiements.cible and a.autre = (select auth.uid()) and a.ok = true)
    )
    or (offre <> 'Contact' and cible is null)
  )
  and not (
    offre = 'Appels'
    and exists (select 1 from public.statuts s where s.user_id = (select auth.uid()) and s.premium_until > now())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "payment receipts owner upload" on storage.objects;
create policy "payment receipts owner upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "payment receipts owner or admin read" on storage.objects;
create policy "payment receipts owner or admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);

drop policy if exists "payment receipts delete unlinked own" on storage.objects;
create policy "payment receipts delete unlinked own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.paiements p
    where p.receipt_path = storage.objects.name
  )
);

commit;
