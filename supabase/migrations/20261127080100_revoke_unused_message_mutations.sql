-- Messages are append-only from the authenticated client.
-- The app sends messages with INSERT and reads them with SELECT; edits/deletes
-- are not part of the client contract. Keep privileged maintenance to service_role.
revoke update, delete on table public.messages from authenticated;
