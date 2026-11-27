-- Supporting indexes for auth-user deletion and message/admin cleanup.
-- These do not change row visibility or write semantics.
create index if not exists admin_actions_cible_idx
  on public.admin_actions(cible);

create index if not exists conversation_pair_index_member_high_idx
  on public.conversation_pair_index(member_high);

create index if not exists messages_sender_id_idx
  on public.messages(sender_id);
