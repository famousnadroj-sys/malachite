-- MALACHITE referral attribution, one referral per newly created account.
create table if not exists public.malachite_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint malachite_referrals_not_self check (referred_user_id <> referrer_id)
);
create index if not exists malachite_referrals_referrer_created_idx on public.malachite_referrals(referrer_id, created_at desc);
alter table public.malachite_referrals enable row level security;
revoke all on table public.malachite_referrals from anon, authenticated;
create or replace function public.record_malachite_referral(p_referrer_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_user_id uuid := (select auth.uid()); v_count integer;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_referrer_id is null or p_referrer_id = v_user_id then return false; end if;
  if not exists(select 1 from public.profiles p where p.id=p_referrer_id) then return false; end if;
  insert into public.malachite_referrals(referred_user_id,referrer_id) values(v_user_id,p_referrer_id) on conflict(referred_user_id) do nothing;
  get diagnostics v_count = row_count; return v_count = 1;
end
$function$;
revoke all on function public.record_malachite_referral(uuid) from public, anon;
grant execute on function public.record_malachite_referral(uuid) to authenticated;
create or replace function public.admin_malachite_referrals()
returns table(referrer_id uuid,referrer_name text,referrer_username text,referred_id uuid,referred_name text,referred_username text,joined_at timestamptz)
language plpgsql security definer set search_path=''
as $function$
begin
  if (select auth.uid()) is null or not private.is_admin() then raise exception 'forbidden'; end if;
  return query select r.referrer_id,coalesce(p1.prenom,'Membre'),p1.username,r.referred_user_id,coalesce(p2.prenom,'Membre'),p2.username,r.created_at
  from public.malachite_referrals r left join public.profiles p1 on p1.id=r.referrer_id left join public.profiles p2 on p2.id=r.referred_user_id
  order by r.created_at desc limit 5000;
end
$function$;
revoke all on function public.admin_malachite_referrals() from public, anon;
grant execute on function public.admin_malachite_referrals() to authenticated;
