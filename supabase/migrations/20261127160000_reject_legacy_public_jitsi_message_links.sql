-- Public meet.jit.si links bypass the authenticated JaaS session/token flow.
-- Malachite calls must use call_sessions + participant-scoped JaaS JWTs only.
-- Redact existing legacy public room URLs before enforcing the new guard.
-- Preserve the message text/history while removing the public join link.
update public.messages
set media_url = null,
    media_type = null
where media_type = 'call'
   or coalesce(media_url,'') ~* '^https://meet[.]jit[.]si/';

create or replace function private.reject_legacy_public_call_links()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.media_type = 'call'
     or coalesce(new.media_url,'') ~* '^https://meet[.]jit[.]si/' then
    raise exception 'legacy_public_call_links_disabled';
  end if;
  return new;
end;
$function$;

revoke all on function private.reject_legacy_public_call_links() from public,anon,authenticated;
drop trigger if exists zz_reject_legacy_public_call_links on public.messages;
create trigger zz_reject_legacy_public_call_links
before insert or update of media_type,media_url on public.messages
for each row execute function private.reject_legacy_public_call_links();
