-- MALACHITE Match: daily likes and privacy-preserving received-likes preview.
-- Apply only after reviewing the matching frontend changes in this feature branch.
begin;

create table if not exists private.match_daily_like_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  liked_on date not null,
  created_at timestamptz not null default now(),
  constraint match_daily_like_events_pk primary key (user_id, target_id, liked_on),
  constraint match_daily_like_events_no_self check (user_id <> target_id)
);

alter table private.match_daily_like_events enable row level security;
revoke all on table private.match_daily_like_events from public, anon, authenticated;

create index if not exists match_daily_like_events_user_day_idx
  on private.match_daily_like_events (user_id, liked_on);

create or replace function private.enforce_match_daily_like_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Africa/Lubumbashi')::date;
  v_new_like boolean := false;
  v_used integer := 0;
  v_target_private boolean := true;
  v_my_rel jsonb := '[]'::jsonb;
  v_target_rel jsonb := '[]'::jsonb;
begin
  if v_uid is null or new.user_id is distinct from v_uid then
    raise exception 'match_auth_required';
  end if;
  if new.autre is null or new.autre = v_uid then
    raise exception 'match_invalid_target';
  end if;
  if private.is_suspended(v_uid) then
    raise exception 'compte_suspendu';
  end if;
  if private.is_blocked_with(new.autre) then
    raise exception 'conversation_bloquee';
  end if;

  if tg_op = 'INSERT' then
    v_new_like := coalesce(new.ok, false);
  else
    v_new_like := coalesce(new.ok, false)
      and (not coalesce(old.ok, false) or new.autre is distinct from old.autre);
  end if;

  if coalesce(new.ok, false) then
    -- Enforce candidate eligibility in the database; the frontend filter is not a security boundary.
    select coalesce(p.profile_private, true)
      into v_target_private
    from public.profiles p
    where p.id = new.autre;

    if not found then
      raise exception 'match_invalid_target';
    end if;
    if v_target_private then
      raise exception 'match_private_target';
    end if;
    if private.is_suspended(new.autre) then
      raise exception 'match_target_suspended';
    end if;

    -- Relationship intentions remain private. Only a boolean decision is made here.
    select case when jsonb_typeof(p.prefs->'rel') = 'array'
                then p.prefs->'rel' else '[]'::jsonb end
      into v_my_rel
    from public.prives p
    where p.id = v_uid;
    v_my_rel := coalesce(v_my_rel, '[]'::jsonb);

    select case when jsonb_typeof(p.prefs->'rel') = 'array'
                then p.prefs->'rel' else '[]'::jsonb end
      into v_target_rel
    from public.prives p
    where p.id = new.autre;
    v_target_rel := coalesce(v_target_rel, '[]'::jsonb);

    if jsonb_array_length(v_my_rel) > 0
       and jsonb_array_length(v_target_rel) > 0
       and not exists (
         select 1
         from jsonb_array_elements_text(v_my_rel) mine(value)
         where mine.value in (
           select jsonb_array_elements_text(v_target_rel)
         )
       ) then
      raise exception 'match_incompatible_target';
    end if;
  end if;

  if v_new_like then
    -- Serialize free-member like attempts to prevent parallel requests
    -- from exceeding the daily allowance.
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

    -- Premium likes must not consume the free allowance if Premium expires
    -- later the same day.
    if not private.est_premium(v_uid) then
      insert into private.match_daily_like_events (user_id, target_id, liked_on)
      values (v_uid, new.autre, v_day)
      on conflict (user_id, target_id, liked_on) do nothing;

      select count(*)::integer into v_used
      from private.match_daily_like_events
      where user_id = v_uid and liked_on = v_day;

      if v_used > 10 then
        raise exception 'match_like_limit_reached';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_match_daily_like_limit() from public, anon, authenticated;

drop trigger if exists enforce_match_daily_like_limit on public.avis_match;
create trigger enforce_match_daily_like_limit
before insert or update on public.avis_match
for each row execute function private.enforce_match_daily_like_limit();

create or replace function private.match_like_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_premium boolean := false;
  v_used integer := 0;
  v_day date := (now() at time zone 'Africa/Lubumbashi')::date;
begin
  if v_uid is null then raise exception 'match_auth_required'; end if;
  if private.is_suspended(v_uid) then raise exception 'compte_suspendu'; end if;

  v_premium := private.est_premium(v_uid);
  if not v_premium then
    select count(*)::integer into v_used
    from private.match_daily_like_events
    where user_id = v_uid and liked_on = v_day;
  end if;

  return jsonb_build_object(
    'premium', v_premium,
    'limit', case when v_premium then null else 10 end,
    'used', v_used,
    'remaining', case when v_premium then null else greatest(0, 10 - v_used) end,
    'resets_at', ((v_day + 1)::timestamp at time zone 'Africa/Lubumbashi')
  );
end;
$function$;

create or replace function private.match_received_likes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_premium boolean := false;
  v_total integer := 0;
  v_visible integer := 0;
  v_ids uuid[] := array[]::uuid[];
begin
  if v_uid is null then raise exception 'match_auth_required'; end if;
  if private.is_suspended(v_uid) then raise exception 'compte_suspendu'; end if;

  v_premium := private.est_premium(v_uid);

  select count(*)::integer into v_total
  from public.avis_match a
  join public.profiles p on p.id = a.user_id
  where a.autre = v_uid
    and a.ok is true
    and a.user_id <> v_uid
    and coalesce(p.profile_private, false) is false
    and not private.is_blocked_with(a.user_id)
    and not private.is_suspended(a.user_id);

  select coalesce(array_agg(q.id order by lower(q.prenom)), array[]::uuid[])
    into v_ids
  from (
    select p.id, p.prenom
    from public.avis_match a
    join public.profiles p on p.id = a.user_id
    where a.autre = v_uid
      and a.ok is true
      and a.user_id <> v_uid
      and coalesce(p.profile_private, false) is false
      and not private.is_blocked_with(a.user_id)
      and not private.is_suspended(a.user_id)
    order by lower(p.prenom)
    limit case when v_premium then null else 3 end
  ) q;

  v_visible := coalesce(cardinality(v_ids), 0);

  return jsonb_build_object(
    'premium', v_premium,
    'total', v_total,
    'visible', v_visible,
    'locked', greatest(0, v_total - v_visible),
    'ids', to_jsonb(v_ids)
  );
end;
$function$;

revoke all on function private.match_like_quota() from public, anon, authenticated;
revoke all on function private.match_received_likes() from public, anon, authenticated;


-- Compare private relationship intentions without returning either member's preferences.
create or replace function private.match_relation_compatible_ids()
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_my_rel jsonb := '[]'::jsonb;
  v_ids uuid[] := array[]::uuid[];
begin
  if v_uid is null then raise exception 'match_auth_required'; end if;
  if private.is_suspended(v_uid) then raise exception 'compte_suspendu'; end if;

  select case when jsonb_typeof(p.prefs->'rel') = 'array'
              then p.prefs->'rel' else '[]'::jsonb end
    into v_my_rel
  from public.prives p
  where p.id = v_uid;

  v_my_rel := coalesce(v_my_rel, '[]'::jsonb);

  select coalesce(array_agg(p.id), array[]::uuid[])
    into v_ids
  from public.profiles p
  left join public.prives other on other.id = p.id
  where p.id <> v_uid
    and coalesce(p.profile_private, false) is false
    and not private.is_blocked_with(p.id)
    and not private.is_suspended(p.id)
    and (
      jsonb_array_length(v_my_rel) = 0
      or jsonb_array_length(
        case when jsonb_typeof(other.prefs->'rel') = 'array'
             then other.prefs->'rel' else '[]'::jsonb end
      ) = 0
      or exists (
        select 1
        from jsonb_array_elements_text(v_my_rel) mine(value)
        where mine.value in (
          select jsonb_array_elements_text(
            case when jsonb_typeof(other.prefs->'rel') = 'array'
                 then other.prefs->'rel' else '[]'::jsonb end
          )
        )
      )
    );

  return v_ids;
end;
$function$;

revoke all on function private.match_relation_compatible_ids() from public, anon, authenticated;

create or replace function public.match_relation_compatible_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $function$
  select private.match_relation_compatible_ids();
$function$;

revoke all on function public.match_relation_compatible_ids() from public, anon;
grant execute on function public.match_relation_compatible_ids() to authenticated;

create or replace function public.match_like_quota()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select private.match_like_quota();
$function$;

create or replace function public.match_received_likes()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select private.match_received_likes();
$function$;

revoke all on function public.match_like_quota(), public.match_received_likes() from public, anon;
grant execute on function public.match_like_quota(), public.match_received_likes() to authenticated;

commit;
