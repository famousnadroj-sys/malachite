begin;

-- Private bucket dedicated to profile photos. Existing public legacy media is
-- intentionally left untouched until the new frontend is deployed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile photos read" on storage.objects;
create policy "profile photos read"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or not private.is_blocked_with(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "profile photos insert own" on storage.objects;
create policy "profile photos insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not private.is_suspended((select auth.uid()))
);

drop policy if exists "profile photos update own" on storage.objects;
create policy "profile photos update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "profile photos delete own" on storage.objects;
create policy "profile photos delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Enforce admin identity from the private allow-list, not a hard-coded email.
create or replace function private.admin_moderate_user(
  p_user_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := (select auth.uid());
begin
  if v_admin is null or not private.is_admin() then
    raise exception 'admin_only';
  end if;
  if p_user_id is null or p_user_id = v_admin then
    raise exception 'invalid_target';
  end if;
  if exists (select 1 from private.admins where user_id = p_user_id) then
    raise exception 'cannot_moderate_admin';
  end if;
  if p_action = 'suspend' then
    insert into public.suspensions(user_id, depuis, motif, par)
    values (p_user_id, now(), left(coalesce(p_reason, 'Suspension après modération'), 300), v_admin)
    on conflict (user_id) do update
      set depuis = excluded.depuis, motif = excluded.motif, par = excluded.par;
    insert into public.admin_actions(admin_id, action, cible, details)
    values (v_admin, 'suspension_ajoutee', p_user_id,
            jsonb_build_object('motif', left(coalesce(p_reason, ''), 300)));
    return jsonb_build_object('ok', true, 'action', 'suspend', 'user_id', p_user_id);
  elsif p_action = 'unsuspend' then
    delete from public.suspensions where user_id = p_user_id;
    insert into public.admin_actions(admin_id, action, cible, details)
    values (v_admin, 'suspension_levee', p_user_id, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'action', 'unsuspend', 'user_id', p_user_id);
  else
    raise exception 'invalid_action';
  end if;
end;
$function$;

revoke all on function private.admin_moderate_user(uuid, text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.admin_moderate_user(uuid, text, text) to authenticated;

create or replace function public.moderate_user(
  p_user_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.admin_moderate_user(p_user_id, p_action, p_reason);
$function$;

revoke all on function public.moderate_user(uuid, text, text) from public, anon;
grant execute on function public.moderate_user(uuid, text, text) to authenticated;

-- Do not inspect or block private message content for phone numbers or links.
-- The free allowance counts only new conversations initiated today (15/day);
-- replies and messages in existing conversations do not consume the allowance.
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
  if private.is_blocked_with(new.a) then
    raise exception 'conversation_bloquee';
  end if;

  if new.media_url is not null or new.media_type is not null then
    if new.media_type in ('image', 'audio') then
      if new.media_url is null
         or new.media_url !~ ('^' || new.de::text || '/' || new.a::text || '/[A-Za-z0-9._-]{1,120}$') then
        raise exception 'media_invalide';
      end if;
    elsif new.media_type = 'call' then
      if new.media_url is null
         or new.media_url !~ '^https://meet\\.jit\\.si/Malachite[0-9a-f]{20,40}$' then
        raise exception 'media_invalide';
      end if;
    else
      raise exception 'media_invalide';
    end if;
  end if;

  if not private.est_premium(new.de) and not exists (
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
        where prior.de = m.a
          and prior.a = m.de
          and prior.created_at < m.created_at
      );
    if n >= 15 then
      raise exception 'limite_gratuite';
    end if;
  end if;

  return new;
end;
$function$;

commit;