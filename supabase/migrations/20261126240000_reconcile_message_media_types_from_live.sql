-- Reconcile the live message guard after the historical document/video media migration
-- source was lost from the repository. This function body was recovered verbatim
-- from the read-only production pg_get_functiondef() on 27 Nov 2026.
-- Keep the established sender, suspension, block, media-path and free-chat checks.
create or replace function public.limite_messages()
returns trigger
language plpgsql
security definer
set search_path to ''
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
 if private.is_blocked_with(new.a) then
  raise exception 'conversation_bloquee';
 end if;

 if new.media_url is not null or new.media_type is not null then
  if new.media_type in ('image','audio','video','document') then
   if new.media_url is null
      or new.media_url !~ ('^'||new.de::text||'/'||new.a::text||'/[A-Za-z0-9._-]{1,120}$') then
    raise exception 'media_invalide';
   end if;
  elsif new.media_type='call' then
   if new.media_url is null
      or new.media_url !~ '^https://meet[.]jit[.]si/Malachite[0-9a-f]{20,40}$' then
    raise exception 'media_invalide';
   end if;
  else
   raise exception 'media_invalide';
  end if;
 end if;

 if not private.est_premium(new.de) and not exists(
   select 1 from public.messages m
   where (m.de=new.de and m.a=new.a) or (m.de=new.a and m.a=new.de)
 ) then
  select count(distinct m.a) into n
  from public.messages m
  where m.de=new.de
    and m.created_at>=date_trunc('day',now())
    and not exists(
      select 1 from public.messages prior
      where prior.de=m.a and prior.a=m.de and prior.created_at<m.created_at
    );
  if n>=15 then
   raise exception 'limite_gratuite';
  end if;
 end if;
 return new;
end;
$function$;

-- Ensure the recovered guard is actually wired to the message insert path.
drop trigger if exists trg_limite on public.messages;
create trigger trg_limite
before insert on public.messages
for each row execute function public.limite_messages();
