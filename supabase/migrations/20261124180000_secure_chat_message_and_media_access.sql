-- Enforce active, unblocked conversation membership for message rows and private chat media.
-- Keep existing message quota and media-path validation behavior intact.

create or replace function public.limite_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  n integer;
begin
  if new.de is distinct from (select auth.uid()) then
    raise exception 'sender_invalide';
  end if;
  if private.is_suspended(new.de) then
    raise exception 'compte_suspendu';
  end if;
  if private.is_suspended(new.a) then
    raise exception 'destinataire_suspendu';
  end if;
  if new.a = new.de then
    raise exception 'destinataire_invalide';
  end if;
  if private.is_blocked_with(new.a) then
    raise exception 'conversation_bloquee';
  end if;
  if not exists (select 1 from public.profiles p where p.id = new.a) then
    raise exception 'destinataire_introuvable';
  end if;

  if new.media_url is not null or new.media_type is not null then
    if new.media_type in ('image','audio','video','document') then
      if new.media_url is null or new.media_url !~ ('^'||new.de::text||'/'||new.a::text||'/[A-Za-z0-9._-]{1,120}$') then
        raise exception 'media_invalide';
      end if;
    elsif new.media_type = 'call' then
      if new.media_url is null or new.media_url !~ '^https://meet[.]jit[.]si/Malachite[0-9a-f]{20,40}$' then
        raise exception 'media_invalide';
      end if;
    else
      raise exception 'media_invalide';
    end if;
  end if;

  if not private.est_premium(new.de)
     and not exists (
       select 1 from public.messages m
       where (m.de = new.de and m.a = new.a)
          or (m.de = new.a and m.a = new.de)
     ) then
    select count(distinct m.a) into n
    from public.messages m
    where m.de = new.de
      and m.created_at >= date_trunc('day', now())
      and not exists (
        select 1 from public.messages prior
        where prior.de = m.a and prior.a = m.de and prior.created_at < m.created_at
      );
    if n >= 15 then
      raise exception 'limite_gratuite';
    end if;
  end if;
  return new;
end;
$function$;

drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message"
on public.messages for insert to authenticated
with check (
  de = (select auth.uid())
  and a <> (select auth.uid())
  and not private.is_blocked_with(a)
  and not private.is_suspended((select auth.uid()))
  and not private.is_suspended(a)
  and exists (select 1 from public.profiles p where p.id = messages.a)
);

drop policy if exists "lire ses messages" on public.messages;
create policy "lire ses messages"
on public.messages for select to authenticated
using (
  (de = (select auth.uid()) or a = (select auth.uid()))
  and not private.is_suspended((select auth.uid()))
  and not private.is_suspended(
    case when de = (select auth.uid()) then a else de end
  )
  and not private.is_blocked_with(
    case when de = (select auth.uid()) then a else de end
  )
);

drop policy if exists "chat-media envoyer" on storage.objects;
create policy "chat-media envoyer"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] is not null
  and not private.blocked_text((storage.foldername(name))[2])
  and not private.is_suspended((select auth.uid()))
  and exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(name))[2]
      and not private.is_suspended(p.id)
  )
);

drop policy if exists "chat-media lire" on storage.objects;
create policy "chat-media lire"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and exists (
    select 1
    from public.messages m
    where m.media_url = objects.name
      and m.media_type in ('image','audio','video','document')
      and (
        (m.de = (select auth.uid()) and m.a::text = (storage.foldername(objects.name))[2])
        or
        (m.a = (select auth.uid()) and m.de::text = (storage.foldername(objects.name))[1])
      )
      and not private.is_suspended(m.de)
      and not private.is_suspended(m.a)
      and not private.is_blocked_with(
        case when m.de = (select auth.uid()) then m.a else m.de end
      )
  )
);
