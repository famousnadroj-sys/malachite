revoke update on table public.user_notifications from authenticated;
grant update(read_at) on table public.user_notifications to authenticated;
revoke all on sequence public.user_notifications_id_seq from authenticated;
