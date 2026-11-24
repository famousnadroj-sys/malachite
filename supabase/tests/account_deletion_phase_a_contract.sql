-- Assertions for docs/ACCOUNT_DELETION_PHASE_A_MIGRATION_DRAFT.sql.
-- Run only after account_deletion_phase_a_fixture.sql and the draft migration.
do $$
begin
  if (select count(*) from public.conversation_threads) <> 3 then
    raise exception 'phase_a_expected_three_threads';
  end if;
  if (select count(*) from public.conversation_pair_index) <> 3 then
    raise exception 'phase_a_expected_three_pair_indexes';
  end if;
  if (select count(*) from public.conversation_members) <> 6 then
    raise exception 'phase_a_expected_six_memberships';
  end if;
  if (select count(*) from public.messages where conversation_id is not null) <> 5 then
    raise exception 'phase_a_expected_five_mapped_messages_including_call';
  end if;
  if (select count(*) from public.messages where de = a and conversation_id is null) <> 1 then
    raise exception 'phase_a_self_message_must_remain_unmapped';
  end if;
  if exists (
    select 1 from public.messages
    where conversation_id is not null and sender_id is distinct from de
  ) then
    raise exception 'phase_a_sender_id_mismatch';
  end if;
  if not exists (
    select 1 from public.conversation_members cm
    join public.conversation_pair_index i using (conversation_id)
    where cm.user_id='30000000-0000-0000-0000-00000000000e'
      and i.member_low='30000000-0000-0000-0000-00000000000b'
  ) then
    raise exception 'phase_a_auth_user_without_profile_was_not_migrated';
  end if;
  if has_table_privilege('authenticated','public.conversation_threads','INSERT')
     or has_table_privilege('authenticated','public.conversation_members','INSERT')
     or has_table_privilege('authenticated','public.conversation_pair_index','INSERT') then
    raise exception 'phase_a_client_must_not_create_threads_or_memberships_directly';
  end if;
end $$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-00000000000a',true);
do $$
begin
  if (select count(*) from public.conversation_threads) <> 1 then
    raise exception 'phase_a_A_must_see_only_AB_thread';
  end if;
  if (select count(*) from public.conversation_pair_index) <> 1 then
    raise exception 'phase_a_A_must_see_only_AB_pair_index';
  end if;
  if (select count(*) from public.conversation_members) <> 1 then
    raise exception 'phase_a_A_must_see_only_own_membership';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-00000000000b',true);
do $$
begin
  if (select count(*) from public.conversation_threads) <> 2 then
    raise exception 'phase_a_B_must_see_AB_and_EB_threads';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-00000000000c',true);
do $$
begin
  if (select count(*) from public.conversation_threads) <> 1 then
    raise exception 'phase_a_C_must_see_only_CD_thread';
  end if;
  if exists (
    select 1 from public.conversation_pair_index
    where member_low='30000000-0000-0000-0000-00000000000a'
       or member_high='30000000-0000-0000-0000-00000000000a'
  ) then
    raise exception 'phase_a_C_must_not_read_AB_pair_index';
  end if;
end $$;
reset role;
reset role;

-- Simulate deleting A from the disposable Auth table. The stable thread and
-- B's membership must survive; the pair index and A's membership must cascade.
delete from auth.users
where id='30000000-0000-0000-0000-00000000000a';

do $$
declare
  ab_thread uuid;
begin
  select conversation_id into ab_thread
  from public.conversation_pair_index
  where member_low='30000000-0000-0000-0000-00000000000a'
     or member_high='30000000-0000-0000-0000-00000000000a';
  if ab_thread is not null then
    raise exception 'phase_a_deleted_user_pair_index_must_cascade';
  end if;

  if not exists (
    select 1 from public.conversation_members cm
    join public.conversation_pair_index i using (conversation_id)
    where i.member_low='30000000-0000-0000-0000-00000000000b'
      and i.member_high='30000000-0000-0000-0000-00000000000e'
      and cm.user_id='30000000-0000-0000-0000-00000000000b'
      and cm.active
  ) then
    -- This checks a surviving membership in a separate thread, not the AB thread.
    raise exception 'phase_a_surviving_membership_contract_failed';
  end if;

  if not exists (
    select 1 from public.messages
    where texte='A vers B' and conversation_id is not null
      and sender_id is null
      and de='30000000-0000-0000-0000-00000000000a'
  ) then
    raise exception 'phase_a_sender_fk_should_null_new_sender_id_but_legacy_de_remains';
  end if;
end $$;

