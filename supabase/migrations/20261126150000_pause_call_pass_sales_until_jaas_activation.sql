-- Do not accept or validate paid call passes while authenticated JaaS is disabled.
-- This closes both client-submission and admin-validation paths at the database boundary.
create or replace function private.guard_call_pass_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.offre = 'Appels'
     and (
       tg_op = 'INSERT'
       or new.statut = 'valide'
       or old.offre is distinct from new.offre
     )
     and not public.call_provider_is_enabled() then
    raise exception using
      errcode = '55000',
      message = 'secure_call_provider_not_configured';
  end if;
  return new;
end
$$;

revoke all on function private.guard_call_pass_activation() from public, anon, authenticated;

drop trigger if exists guard_call_pass_activation on public.paiements;
create trigger guard_call_pass_activation
before insert or update of offre, statut on public.paiements
for each row execute function private.guard_call_pass_activation();
