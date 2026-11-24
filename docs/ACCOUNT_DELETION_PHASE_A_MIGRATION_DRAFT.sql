-- MALACHITE PHASE A — DRAFT ONLY; DO NOT APPLY TO PRODUCTION.
-- This is a reviewed candidate for a disposable test database only.
-- It is additive: it does not remove legacy messages.de/a, change existing
-- message RLS, rewrite receipts, or perform account deletion.
begin;

create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_pair_index (
  member_low uuid not null references auth.users(id) on delete cascade,
  member_high uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null unique
    references public.conversation_threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_low, member_high),
  constraint conversation_pair_index_canonical_pair
    check (member_low < member_high)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null
    references public.conversation_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id),
  constraint conversation_members_active_left_consistency
    check ((active and left_at is null) or (not active))
);

alter table public.messages
  add column if not exists conversation_id uuid
    references public.conversation_threads(id) on delete restrict;
alter table public.messages
  add column if not exists sender_id uuid
    references auth.users(id) on delete set null;
alter table public.messages
  add column if not exists sender_deleted_at timestamptz;

create index if not exists conversation_members_user_active_idx
  on public.conversation_members(user_id, active);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc, id desc);
create index if not exists conversation_pair_index_conversation_idx
  on public.conversation_pair_index(conversation_id);

alter table public.conversation_threads enable row level security;
alter table public.conversation_pair_index enable row level security;
alter table public.conversation_members enable row level security;

drop policy if exists "conversation threads read by active members"
  on public.conversation_threads;
create policy "conversation threads read by active members"
on public.conversation_threads for select to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_threads.id
      and cm.user_id = (select auth.uid())
      and cm.active
  )
);

drop policy if exists "conversation pair index read by participants"
  on public.conversation_pair_index;
create policy "conversation pair index read by participants"
on public.conversation_pair_index for select to authenticated
using (
  member_low = (select auth.uid())
  or member_high = (select auth.uid())
);

drop policy if exists "conversation members read own membership"
  on public.conversation_members;
create policy "conversation members read own membership"
on public.conversation_members for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.conversation_threads to authenticated;
grant select on public.conversation_pair_index to authenticated;
grant select on public.conversation_members to authenticated;

-- Idempotent backfill: self-addressed rows are deliberately not mapped.
-- Auth users without a profiles row remain eligible; profile presence is not
-- the identity authority. Rows with missing Auth identities are not guessed.
do $backfill$
declare
  pair_row record;
  v_thread_id uuid;
  v_new_thread_id uuid;
begin
  for pair_row in
    select distinct least(m.de, m.a) as member_low,
                    greatest(m.de, m.a) as member_high
    from public.messages m
    where m.de <> m.a
      and exists (select 1 from auth.users u where u.id = m.de)
      and exists (select 1 from auth.users u where u.id = m.a)
  loop
    select i.conversation_id into v_thread_id
    from public.conversation_pair_index i
    where i.member_low = pair_row.member_low
      and i.member_high = pair_row.member_high;

    if v_thread_id is null then
      insert into public.conversation_threads default values
      returning id into v_new_thread_id;

      insert into public.conversation_pair_index(
        member_low, member_high, conversation_id
      ) values (
        pair_row.member_low, pair_row.member_high, v_new_thread_id
      )
      on conflict (member_low, member_high) do nothing;

      select i.conversation_id into v_thread_id
      from public.conversation_pair_index i
      where i.member_low = pair_row.member_low
        and i.member_high = pair_row.member_high;

      -- If another writer won the unique pair race, remove our unused thread.
      if v_thread_id is distinct from v_new_thread_id then
        delete from public.conversation_threads
        where id = v_new_thread_id;
      end if;
    end if;
  end loop;
end;
$backfill$;

insert into public.conversation_members(conversation_id, user_id)
select i.conversation_id, participant.user_id
from public.conversation_pair_index i
cross join lateral (values (i.member_low), (i.member_high)) participant(user_id)
on conflict (conversation_id, user_id) do nothing;

update public.messages m
set conversation_id = i.conversation_id,
    sender_id = coalesce(m.sender_id, m.de)
from public.conversation_pair_index i
where m.conversation_id is null
  and m.de <> m.a
  and i.member_low = least(m.de, m.a)
  and i.member_high = greatest(m.de, m.a);

-- Fail the migration transaction rather than silently losing a valid pair.
do $verify$
begin
  if exists (
    select 1 from public.messages m
    where m.de <> m.a
      and exists (select 1 from auth.users u where u.id = m.de)
      and exists (select 1 from auth.users u where u.id = m.a)
      and (m.conversation_id is null or m.sender_id is null)
  ) then
    raise exception 'phase_a_backfill_incomplete';
  end if;
end;
$verify$;

commit;
