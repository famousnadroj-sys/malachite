-- Persist existing in-app system toasts (appointments, matches and operational alerts).
create or replace function public.create_my_notification(
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
  values (
    (select auth.uid()), v_kind, p_category, v_title, v_body, btrim(p_dedupe_key)
  )
  on conflict (user_id, announcement_key)
    where announcement_key is not null
    do nothing
  returning id into v_id;

  return v_id;
end
$function$;

revoke all on function public.create_my_notification(text, text, text, text) from public, anon;
grant execute on function public.create_my_notification(text, text, text, text) to authenticated;
