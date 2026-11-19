create table if not exists public.message_receipts (
  message_id bigint primary key references public.messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  constraint message_receipts_distinct_users check (sender_id <> recipient_id),
  constraint message_receipts_read_after_delivery check (read_at is null or read_at >= delivered_at)
);
create index if not exists message_receipts_sender_idx on public.message_receipts(sender_id, message_id);
create index if not exists message_receipts_recipient_idx on public.message_receipts(recipient_id, message_id);
alter table public.message_receipts enable row level security;
revoke all on public.message_receipts from anon, authenticated;
grant select, insert on public.message_receipts to authenticated;
grant update (read_at) on public.message_receipts to authenticated;
drop policy if exists "participants read message receipts" on public.message_receipts;
create policy "participants read message receipts"
on public.message_receipts for select to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "recipient records delivery" on public.message_receipts;
create policy "recipient records delivery"
on public.message_receipts for insert to authenticated
with check (
  auth.uid() = recipient_id
  and exists (
    select 1 from public.messages m
    where m.id = message_id and m.de = sender_id and m.a = recipient_id
  )
);
drop policy if exists "recipient marks read" on public.message_receipts;
create policy "recipient marks read"
on public.message_receipts for update to authenticated
using (auth.uid() = recipient_id)
with check (
  auth.uid() = recipient_id
  and exists (
    select 1 from public.messages m
    where m.id = message_id and m.de = sender_id and m.a = recipient_id
  )
);
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_receipts'
  ) then
    alter publication supabase_realtime add table public.message_receipts;
  end if;
end $$;
