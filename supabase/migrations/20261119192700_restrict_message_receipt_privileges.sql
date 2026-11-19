revoke all on public.message_receipts from anon, authenticated;
grant select, insert on public.message_receipts to authenticated;
grant update (read_at) on public.message_receipts to authenticated;
