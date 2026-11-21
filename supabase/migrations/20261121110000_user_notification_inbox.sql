-- Durable member inbox: messages, news, alerts and promotions.
-- Existing payment notifications remain intact and are categorized as payments.

alter table public.user_notifications
  add column if not exists category text not null default 'payment',
  add column if not exists related_message_id bigint references public.messages(id) on delete cascade,
  add column if not exists related_user_id uuid references auth.users(id) on delete set null,
  add column if not exists announcement_key text;

update public.user_notifications
set category='payment'
where category is distinct from 'payment';

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check,
  add constraint user_notifications_kind_check
    check (kind = any (array[
      'payment_approved',
      'payment_rejected',
      'entitlement_expired',
      'message_received',
      'announcement',
      'system_alert',
      'promotion',
      'system_notice'
    ])),
  add constraint user_notifications_category_check
    check (category = any (array[
      'payment',
      'message',
      'news',
      'alert',
      'promotion',
      'system'
    ]));

create unique index if not exists user_notifications_message_unique
  on public.user_notifications(user_id, related_message_id)
  where related_message_id is not null;

create unique index if not exists user_notifications_announcement_key_unique
  on public.user_notifications(user_id, announcement_key)
  where announcement_key is not null;

create or replace function private.notify_new_member_message()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if new.de is null or new.a is null or new.de = new.a or new.media_type = 'call' then
    return new;
  end if;

  insert into public.user_notifications(
    user_id, kind, category, title, body, related_message_id, related_user_id
  )
  values (
    new.a,
    'message_received',
    'message',
    'Nouveau message',
    'Tu as reçu un nouveau message.',
    new.id,
    new.de
  )
  on conflict (user_id, related_message_id)
    where related_message_id is not null
    do nothing;

  return new;
end
$function$;

revoke all on function private.notify_new_member_message() from public, anon, authenticated;

drop trigger if exists trg_notify_new_member_message on public.messages;
create trigger trg_notify_new_member_message
after insert on public.messages
for each row execute function private.notify_new_member_message();

create or replace function public.publish_user_announcement(
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
  select
    p.id, v_kind, p_category, v_title, v_body, nullif(btrim(p_dedupe_key), '')
  from public.profiles p
  on conflict (user_id, announcement_key)
    where announcement_key is not null
    do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$function$;

revoke all on function public.publish_user_announcement(text, text, text, text) from public, anon;
grant execute on function public.publish_user_announcement(text, text, text, text) to authenticated;
