-- Preserve prepaid call-pass time while the authenticated provider is disabled.
alter table private.call_provider_config
  add column if not exists disabled_since timestamptz;

update private.call_provider_config
set disabled_since = now()
where enabled = false and disabled_since is null;

create or replace function private.preserve_call_pass_time_on_provider_toggle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_disabled_since timestamptz;
  v_pause interval;
begin
  if old.enabled = false and new.enabled = true then
    v_disabled_since := coalesce(old.disabled_since, now());
    v_pause := greatest(now() - v_disabled_since, interval '0 seconds');

    if v_pause > interval '0 seconds' then
      update public.paiements p
      set entitlement_expires_at =
        coalesce(
          p.entitlement_expires_at,
          p.reviewed_at + interval '7 days',
          p.created_at + interval '7 days'
        ) + v_pause
      where p.offre = 'Appels'
        and p.statut = 'valide'
        and coalesce(
          p.entitlement_expires_at,
          p.reviewed_at + interval '7 days',
          p.created_at + interval '7 days'
        ) > v_disabled_since;
    end if;

    new.disabled_since := null;
  elsif old.enabled = true and new.enabled = false then
    new.disabled_since := now();
  end if;
  return new;
end
$$;

revoke all on function private.preserve_call_pass_time_on_provider_toggle() from public, anon, authenticated;

drop trigger if exists preserve_call_pass_time_on_provider_toggle on private.call_provider_config;
create trigger preserve_call_pass_time_on_provider_toggle
before update of enabled on private.call_provider_config
for each row execute function private.preserve_call_pass_time_on_provider_toggle();
