-- Storage RLS policies use this helper to enforce chat-media and filename
-- restrictions. Grant only this additional predicate; other private functions
-- remain closed to API roles.
grant execute on function private.blocked_text(text) to authenticated;