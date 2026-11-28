do $checks$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='admin_actions'
      and indexname='admin_actions_cible_idx'
      and indexdef ilike '%(cible)%'
  ) then
    raise exception 'admin_actions_cible_fk_index_missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='conversation_pair_index'
      and indexname='conversation_pair_index_member_high_idx'
      and indexdef ilike '%(member_high)%'
  ) then
    raise exception 'conversation_pair_member_high_fk_index_missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='messages'
      and indexname='messages_sender_id_idx'
      and indexdef ilike '%(sender_id)%'
  ) then
    raise exception 'messages_sender_id_fk_index_missing';
  end if;
end
$checks$;
