-- MALACHITE launch scope: accept only Premium, Boost and paid calls.
-- Retires standalone Contact unlock and Verified Badge payment submissions.
begin;

drop policy if exists "declarer un paiement" on public.paiements;

create policy "declarer un paiement"
on public.paiements
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and statut = 'attente'
  and offre = any (array['Premium','Boost','Appels'])
  and cible is null
  and char_length(btrim(code)) between 4 and 100
  and operateur in ('airtel','orange')
  and receipt_path is not null
  and exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'payment-receipts'
      and o.name = paiements.receipt_path
      and (storage.foldername(o.name))[1] = (select auth.uid())::text
  )
  and not (
    offre = 'Appels'
    and exists (
      select 1 from public.statuts s
      where s.user_id = (select auth.uid())
        and s.premium_until > now()
    )
  )
);

commit;
