-- MALACHITE account-deletion behavior contract test (disposable only).
-- This test models the intended conversation semantics; it does NOT execute the
-- production triggers, RLS policies, Storage policies, or Auth deletion workflow.
-- Run only on a disposable PostgreSQL database. Everything is rolled back.

begin;

create temporary table test_conversations (
  id text primary key
) on commit drop;

create temporary table test_members (
  conversation_id text not null references test_conversations(id),
  user_id text not null,
  active boolean not null default true,
  primary key (conversation_id, user_id)
) on commit drop;

create temporary table test_messages (
  id integer primary key,
  conversation_id text not null references test_conversations(id),
  sender_id text,
  sender_deleted_at timestamptz,
  body text not null
) on commit drop;

insert into test_conversations(id) values ('ab'), ('bc');
insert into test_members(conversation_id,user_id) values
  ('ab','A'),('ab','B'),('bc','B'),('bc','C');
insert into test_messages(id,conversation_id,sender_id,body) values
  (1,'ab','A','message from A'),
  (2,'ab','B','reply from B'),
  (3,'bc','C','unrelated C message');

-- Simulate the account-deletion data transformation: anonymize A's authorship,
-- remove A's membership, and retain B's membership and the shared conversation.
update test_messages
set sender_id = null, sender_deleted_at = now()
where conversation_id = 'ab' and sender_id = 'A';

delete from test_members
where user_id = 'A';

-- Repeat the same cleanup operation to prove the fixture's transformation
-- remains safe to retry after a partial workflow retry.
update test_messages
set sender_id = null, sender_deleted_at = coalesce(sender_deleted_at, now())
where conversation_id = 'ab' and sender_id = 'A';
delete from test_members where user_id = 'A';

do $$
declare
  v_count integer;
  v_body text;
begin
  -- B must retain the shared conversation and both retained text messages.
  select count(*) into v_count
  from test_messages m
  join test_members cm on cm.conversation_id = m.conversation_id
  where cm.user_id = 'B' and cm.active and m.conversation_id = 'ab';

  if v_count <> 2 then
    raise exception 'FAIL: recipient B did not retain both messages (count=%)', v_count;
  end if;

  -- The deleted sender's membership must be removed entirely.
  select count(*) into v_count
  from test_members
  where user_id = 'A';

  if v_count <> 0 then
    raise exception 'FAIL: deleted member A still has active membership';
  end if;

  -- Retained message must be anonymized, not reassigned to B.
  select body into v_body
  from test_messages
  where id = 1 and sender_id is null and sender_deleted_at is not null;

  if v_body is distinct from 'message from A' then
    raise exception 'FAIL: original message was not retained with anonymized sender';
  end if;

  -- B's own reply remains authored by B.
  if not exists (
    select 1 from test_messages
    where id = 2 and sender_id = 'B' and sender_deleted_at is null
  ) then
    raise exception 'FAIL: B message was modified';
  end if;

  -- The unrelated B-C conversation remains unchanged.
  if not exists (
    select 1 from test_messages
    where id = 3 and conversation_id = 'bc' and sender_id = 'C'
      and body = 'unrelated C message'
  ) then
    raise exception 'FAIL: unrelated B-C conversation was modified';
  end if;

  raise notice 'PASS: retained conversation, sender anonymization, membership removal, and unrelated conversation isolation';
end
$$;

rollback;
