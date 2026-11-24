-- RLS behavior contract for the proposed Malachite conversation-membership model.
-- Runs only in the disposable PostgreSQL CI database. Entire fixture rolls back.
begin;

create schema auth;
create schema account_deletion_rls_contract;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$roles$;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table account_deletion_rls_contract.conversations (
  id uuid primary key
);

create table account_deletion_rls_contract.conversation_members (
  conversation_id uuid not null references account_deletion_rls_contract.conversations(id),
  user_id uuid not null,
  active boolean not null default true,
  primary key (conversation_id, user_id)
);

create table account_deletion_rls_contract.messages (
  id bigint primary key,
  conversation_id uuid not null references account_deletion_rls_contract.conversations(id),
  sender_id uuid,
  body text not null,
  sender_deleted_at timestamptz
);

insert into account_deletion_rls_contract.conversations(id) values
 ('10000000-0000-0000-0000-0000000000ab'),
 ('10000000-0000-0000-0000-0000000000cd');

insert into account_deletion_rls_contract.conversation_members(conversation_id,user_id,active) values
 ('10000000-0000-0000-0000-0000000000ab','10000000-0000-0000-0000-00000000000b',true),
 ('10000000-0000-0000-0000-0000000000cd','10000000-0000-0000-0000-00000000000c',true),
 ('10000000-0000-0000-0000-0000000000cd','10000000-0000-0000-0000-00000000000d',true);

insert into account_deletion_rls_contract.messages(id,conversation_id,sender_id,body,sender_deleted_at) values
 (1,'10000000-0000-0000-0000-0000000000ab',null,'Message conservé de A',now()),
 (2,'10000000-0000-0000-0000-0000000000ab','10000000-0000-0000-0000-00000000000b','Réponse de B',null),
 (3,'10000000-0000-0000-0000-0000000000cd','10000000-0000-0000-0000-00000000000c','Fil indépendant C-D',null);

alter table account_deletion_rls_contract.conversation_members enable row level security;
alter table account_deletion_rls_contract.messages enable row level security;

create policy "member reads own membership"
on account_deletion_rls_contract.conversation_members
for select to authenticated
using (user_id = (select auth.uid()) and active);

create policy "active conversation members read messages"
on account_deletion_rls_contract.messages
for select to authenticated
using (
  exists (
    select 1
    from account_deletion_rls_contract.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = (select auth.uid())
      and cm.active
  )
);

grant usage on schema auth, account_deletion_rls_contract to authenticated;
grant execute on function auth.uid() to authenticated;
grant select on account_deletion_rls_contract.conversation_members,
                account_deletion_rls_contract.messages to authenticated;

set role authenticated;

do $test_b$
declare
  n integer;
  retained_author_is_null boolean;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-00000000000b',true);
  select count(*) into n from account_deletion_rls_contract.messages;
  if n <> 2 then raise exception 'FAIL: B should read two retained messages, found %', n; end if;

  select (sender_id is null and sender_deleted_at is not null)
    into retained_author_is_null
  from account_deletion_rls_contract.messages where id=1;
  if retained_author_is_null is distinct from true then
    raise exception 'FAIL: B must see retained message with anonymized sender';
  end if;
end
$test_b$;

do $test_a$
declare n integer;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-00000000000a',true);
  select count(*) into n from account_deletion_rls_contract.messages;
  if n <> 0 then raise exception 'FAIL: deleted account A can still read messages'; end if;
end
$test_a$;

do $test_c$
declare n integer;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-00000000000c',true);
  select count(*) into n from account_deletion_rls_contract.messages;
  if n <> 1 then raise exception 'FAIL: C should read only its own conversation, found %', n; end if;
end
$test_c$;

do $test_d$
declare n integer;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-0000-0000-00000000000d',true);
  select count(*) into n from account_deletion_rls_contract.messages;
  if n <> 1 then raise exception 'FAIL: D should read only its own conversation, found %', n; end if;
end
$test_d$;

reset role;
rollback;
