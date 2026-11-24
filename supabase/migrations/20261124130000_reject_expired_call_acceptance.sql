-- Prevent accepting a pending call after its server-side expiry.
-- Additive guard: preserves existing call rows and the existing participant transition guard.
create or replace function private.reject_expired_call_acceptance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
 if old.status='pending'
    and new.status='accepted'
    and old.expires_at<=now() then
  raise exception 'call_session_expired';
 end if;
 return new;
end
$$;

drop trigger if exists reject_expired_call_acceptance on public.call_sessions;
create trigger reject_expired_call_acceptance
before update of status on public.call_sessions
for each row execute function private.reject_expired_call_acceptance();
