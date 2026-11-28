-- Conversation index/thread tables are legacy internal metadata; the shipped
-- client uses public.messages and message_receipts directly. Keep client reads
-- available for compatibility, but remove unused direct writes.
revoke insert, update, delete on table
  public.conversation_members,
  public.conversation_pair_index,
  public.conversation_threads
from authenticated;

-- Support requests are submitted by members and handled by the admin UI;
-- direct deletion is not a supported client action.
revoke delete on table public.demandes_support from authenticated;
