-- Add explicit navigation targets for actionable member notifications.
alter table public.user_notifications
  add column if not exists action_type text,
  add column if not exists action_id text;

alter table public.user_notifications
  drop constraint if exists user_notifications_action_type_check,
  add constraint user_notifications_action_type_check
    check (action_type is null or action_type = any (array['chat','match','rdv','adm','offres']));

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

create index if not exists user_notifications_unread_user_idx
  on public.user_notifications(user_id)
  where read_at is null;

create or replace function private.create_my_notification(
  p_category text, p_title text, p_body text, p_dedupe_key text,
  p_action_type text, p_action_id text, p_related_user_id uuid
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
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if p_category not in ('news', 'alert', 'promotion', 'system') then raise exception 'invalid_notification_category'; end if;
  if char_length(v_title) < 2 or char_length(v_title) > 90 then raise exception 'invalid_notification_title'; end if;
  if char_length(v_body) < 2 or char_length(v_body) > 500 then raise exception 'invalid_notification_body'; end if;
  if p_dedupe_key is null or char_length(btrim(p_dedupe_key)) not between 8 and 120 then raise exception 'invalid_dedupe_key'; end if;
  if p_action_type is not null and p_action_type not in ('chat','match','rdv','adm','offres') then raise exception 'invalid_notification_action'; end if;
  if p_action_id is not null and char_length(p_action_id) not between 1 and 120 then raise exception 'invalid_notification_action_id'; end if;
  if p_related_user_id is not null then
    if p_related_user_id = (select auth.uid())
      or not exists (select 1 from public.profiles p where p.id = p_related_user_id) then
      raise exception 'invalid_related_user';
    end if;
  end if;
  if p_action_type = 'match' and p_related_user_id is null then raise exception 'match_target_required'; end if;

  v_kind := case p_category when 'news' then 'announcement' when 'alert' then 'system_alert'
    when 'promotion' then 'promotion' else 'system_notice' end;

  insert into public.user_notifications(
    user_id, kind, category, title, body, announcement_key, action_type, action_id, related_user_id
  )
  values (
    (select auth.uid()), v_kind, p_category, v_title, v_body, btrim(p_dedupe_key),
    p_action_type, p_action_id, p_related_user_id
  )
  on conflict (user_id, announcement_key) where announcement_key is not null
  do nothing
  returning id into v_id;
  return v_id;
end
$function$;

revoke all on function private.create_my_notification(text,text,text,text,text,text,uuid) from public, anon;
grant execute on function private.create_my_notification(text,text,text,text,text,text,uuid) to authenticated;

create or replace function public.create_my_notification(
  p_category text, p_title text, p_body text, p_dedupe_key text,
  p_action_type text, p_action_id text, p_related_user_id uuid
)
returns bigint
language sql
security invoker
set search_path=''
as $function$
  select private.create_my_notification(p_category,p_title,p_body,p_dedupe_key,p_action_type,p_action_id,p_related_user_id)
$function$;

revoke all on function public.create_my_notification(text,text,text,text,text,text,uuid) from public, anon;
grant execute on function public.create_my_notification(text,text,text,text,text,text,uuid) to authenticated;
