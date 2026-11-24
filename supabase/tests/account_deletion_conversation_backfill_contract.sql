-- Backfill contract for Malachite's proposed stable one-to-one conversation IDs.
-- Disposable PostgreSQL only; all objects are rolled back.
begin;

create temporary table legacy_messages (
  id bigint primary key,
  de uuid not null,
  a uuid not null,
  body text not null
) on commit drop;

create temporary table conversation_threads (
  id uuid primary key default gen_random_uuid(),
  member_low uuid not null,
  member_high uuid not null,
  unique(member_low, member_high),
  check(member_low < member_high)
) on commit drop;

create temporary table migrated_messages (
  id bigint primary key,
  conversation_id uuid not null references conversation_threads(id),
  sender_id uuid not null,
  body text not null
) on commit drop;

create temporary table conversation_members (
  conversation_id uuid not null references conversation_threads(id),
  user_id uuid not null,
  active boolean not null default true,
  primary key(conversation_id,user_id)
) on commit drop;

insert into legacy_messages(id,de,a,body) values
 (1,'20000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-00000000000b','A vers B'),
 (2,'20000000-0000-0000-0000-00000000000b','20000000-0000-0000-0000-00000000000a','B vers A'),
 (3,'20000000-0000-0000-0000-00000000000c','20000000-0000-0000-0000-00000000000d','C vers D');

-- Canonicalize the pair so A->B and B->A become one thread.
insert into conversation_threads(member_low,member_high)
select distinct least(de,a), greatest(de,a)
from legacy_messages
where de <> a
on conflict(member_low,member_high) do nothing;

insert into conversation_members(conversation_id,user_id)
select t.id, p.user_id
from conversation_threads t
cross join lateral (values(t.member_low),(t.member_high)) p(user_id)
on conflict(conversation_id,user_id) do nothing;

insert into migrated_messages(id,conversation_id,sender_id,body)
select m.id,t.id,m.de,m.body
from legacy_messages m
join conversation_threads t
  on t.member_low=least(m.de,m.a)
 and t.member_high=greatest(m.de,m.a);

do $$
declare
  thread_count integer;
  member_count integer;
  message_count integer;
  ab_threads integer;
begin
  select count(*) into thread_count from conversation_threads;
  if thread_count <> 2 then
    raise exception 'FAIL: expected two unique conversations, found %',thread_count;
  end if;

  select count(*) into member_count from conversation_members;
  if member_count <> 4 then
    raise exception 'FAIL: expected four memberships, found %',member_count;
  end if;

  select count(*) into message_count from migrated_messages;
  if message_count <> 3 then
    raise exception 'FAIL: expected all legacy messages to be backfilled, found %',message_count;
  end if;

  select count(distinct conversation_id) into ab_threads
  from migrated_messages
  where (sender_id='20000000-0000-0000-0000-00000000000a'
         and conversation_id in (
           select conversation_id from migrated_messages
           where sender_id='20000000-0000-0000-0000-00000000000b'
         ));
  if ab_threads <> 1 then
    raise exception 'FAIL: opposite message directions did not map to one shared conversation';
  end if;
end
$$;

rollback;
