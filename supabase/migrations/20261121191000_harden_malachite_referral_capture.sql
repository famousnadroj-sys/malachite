-- Attribute referrals at auth.users INSERT time so users cannot rewrite attribution later.
create or replace function private.capture_malachite_referral()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_referrer_id uuid;
begin
  begin
    v_referrer_id := nullif(new.raw_user_meta_data->>'referrer_id','')::uuid;
  exception when invalid_text_representation then
    return new;
  end;
  if v_referrer_id is null or v_referrer_id = new.id then return new; end if;
  if not exists(select 1 from public.profiles p where p.id=v_referrer_id) then return new; end if;
  insert into public.malachite_referrals(referred_user_id,referrer_id)
  values(new.id,v_referrer_id)
  on conflict(referred_user_id) do nothing;
  return new;
end
$function$;
revoke all on function private.capture_malachite_referral() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_malachite_referral on auth.users;
create trigger on_auth_user_created_malachite_referral
after insert on auth.users
for each row execute function private.capture_malachite_referral();
revoke all on function public.record_malachite_referral(uuid) from public, anon, authenticated;
drop function public.record_malachite_referral(uuid);
