-- Expose only the two payment-operator labels consumed by the member client.
-- Other configuration keys must remain unavailable through the public Data API.
drop policy if exists "voir config" on public.config;
create policy "voir config" on public.config
for select to authenticated
using (cle in ('airtel','orange'));
