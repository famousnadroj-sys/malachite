-- Keep exposed RPCs SECURITY INVOKER; privileged work stays in the private schema.
create or replace function private.publish_user_announcement(
  p_category text,
  p_title text,
  p_body text,
  p_dedupe_key text default null
)
returns integer
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_kind text;
  v_inserted integer;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_category not in ('news', 'alert', 'promotion', 'system') then
    raise exception 'invalid_notification_category';
  end if;
  if char_length(v_title) < 3 or char_length(v_title) > 90 then
    raise exception 'invalid_notification_title';
  end if;
  if char_length(v_body) < 5 or char_length(v_body) > 500 then
    raise exception 'invalid_notification_body';
  end if;
  if p_dedupe_key is not null and char_length(btrim(p_dedupe_key)) not between 8 and 120 then
    raise exception 'invalid_dedupe_key';
  end if;

  v_kind := case p_category
    when 'news' then 'announcement'
    when 'alert' then 'system_alert'
    when 'promotion' then 'promotion'
    else 'system_notice'
  end;

  insert into public.user_notifications(
    user_id, kind, category, title, body, announcement_key
  )
  select p.id, v_kind, p_category, v_title, v_body, nullif(btrim(p_dedupe_key), '')
  from public.profiles p
  on conflict (user_id, announcement_key)
    where announcement_key is not null
    do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$function$;

create or replace function private.create_my_notification(
  p_category text,
  p_title text,
  p_body text,
  p_dedupe_key text
)
returns bigint
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_kind text;
  v_id bigint;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;
  if p_category not in ('news', 'alert', 'promotion', 'system') then
    raise exception 'invalid_notification_category';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 90 then
    raise exception 'invalid_notification_title';
  end if;
  if char_length(v_body) < 2 or char_length(v_body) > 500 then
    raise exception 'invalid_notification_body';
  end if;
  if p_dedupe_key is null or char_length(btrim(p_dedupe_key)) not between 8 and 120 then
    raise exception 'invalid_dedupe_key';
  end if;

  v_kind := case p_category
    when 'news' then 'announcement'
    when 'alert' then 'system_alert'
    when 'promotion' then 'promotion'
    else 'system_notice'
  end;

  insert into public.user_notifications(
    user_id, kind, category, title, body, announcement_key
  )
  values ((select auth.uid()), v_kind, p_category, v_title, v_body, btrim(p_dedupe_key))
  on conflict (user_id, announcement_key)
    where announcement_key is not null
    do nothing
  returning id into v_id;

  return v_id;
end
$function$;

revoke all on function private.publish_user_announcement(text, text, text, text) from public, anon;
revoke all on function private.create_my_notification(text, text, text, text) from public, anon;
grant execute on function private.publish_user_announcement(text, text, text, text) to authenticated;
grant execute on function private.create_my_notification(text, text, text, text) to authenticated;

create or replace function public.publish_user_announcement(
  p_category text,
  p_title text,
  p_body text,
  p_dedupe_key text default null
)
returns integer
language sql
security invoker
set search_path=''
as $function$
  select private.publish_user_announcement(p_category, p_title, p_body, p_dedupe_key)
$function$;

create or replace function public.create_my_notification(
  p_category text,
  p_title text,
  p_body text,
  p_dedupe_key text
)
returns bigint
language sql
security invoker
set search_path=''
as $function$
  select private.create_my_notification(p_category, p_title, p_body, p_dedupe_key)
$function$;

revoke all on function public.publish_user_announcement(text, text, text, text) from public, anon;
revoke all on function public.create_my_notification(text, text, text, text) from public, anon;
grant execute on function public.publish_user_announcement(text, text, text, text) to authenticated;
grant execute on function public.create_my_notification(text, text, text, text) to authenticated;

create index if not exists user_notifications_related_message_idx
  on public.user_notifications(related_message_id)
  where related_message_id is not null;
create index if not exists user_notifications_related_user_idx
  on public.user_notifications(related_user_id)
  where related_user_id is not null;
