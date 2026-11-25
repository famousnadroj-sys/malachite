do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end
$$;

create schema auth;
create schema private;
create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.paiements(
  id bigint primary key,
  user_id uuid not null,
  statut text not null,
  offre text not null,
  entitlement_expires_at timestamptz,
  expiry_notified_at timestamptz
);
create table public.user_notifications(
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text not null,
  related_payment_id bigint,
  constraint user_notifications_expiry_unique unique(user_id,related_payment_id,kind)
);

create or replace function private.entitlement_is_active(p_user_id uuid,p_offer text)
returns boolean language sql stable security definer set search_path=''
as $$ select false $$;

create or replace function private.check_my_entitlement_expirations()
returns integer language sql security definer set search_path=''
as $ select 0 $;

create or replace function public.check_my_entitlement_expirations()
returns integer language sql security definer set search_path=''
as $$ select private.check_my_entitlement_expirations() $$;

revoke all on function public.check_my_entitlement_expirations() from public,anon;
grant execute on function public.check_my_entitlement_expirations() to authenticated;
