-- Database-level regression tests for the mandatory 18+ profile age.
-- Run after 20261124250000_enforce_profile_age_required.sql in an isolated DB.
begin;

insert into auth.users(id) values
 ('71000000-0000-0000-0000-000000000001'),
 ('71000000-0000-0000-0000-000000000002'),
 ('71000000-0000-0000-0000-000000000003'),
 ('71000000-0000-0000-0000-000000000004');

do $test$
begin
  begin
    insert into public.profiles(id,prenom,age)
    values ('71000000-0000-0000-0000-000000000001','No age',null);
    raise exception 'null_profile_age_was_accepted';
  exception when not_null_violation then
    null;
  end;

  begin
    insert into public.profiles(id,prenom,age)
    values ('71000000-0000-0000-0000-000000000002','Underage',17);
    raise exception 'underage_profile_was_accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.profiles(id,prenom,age)
    values ('71000000-0000-0000-0000-000000000003','Out of range',101);
    raise exception 'out_of_range_profile_age_was_accepted';
  exception when check_violation then
    null;
  end;
end
$test$;

insert into public.profiles(id,prenom,age)
values ('71000000-0000-0000-0000-000000000004','Adult',18);

do $test$
begin
  if not exists (
    select 1 from public.profiles
    where id='71000000-0000-0000-0000-000000000004' and age=18
  ) then
    raise exception 'valid_minimum_adult_age_was_rejected';
  end if;
end
$test$;

-- The authenticated profile-save RPC must reject missing, underage,
-- out-of-range, and contradictory age values before writing any profile data.
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000004',true);

do $test$
declare
  v_rejected boolean;
  v_profile jsonb;
begin
  v_rejected := false;
  begin
    perform public.save_my_profile(
      '{"id":"71000000-0000-0000-0000-000000000004","prenom":"Missing"}'::jsonb,
      '{}'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'save_rpc_accepted_missing_age'; end if;

  v_rejected := false;
  begin
    perform public.save_my_profile(
      '{"id":"71000000-0000-0000-0000-000000000004","prenom":"Underage","age":17}'::jsonb,
      '{"profile_age":17}'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'save_rpc_accepted_underage'; end if;

  v_rejected := false;
  begin
    perform public.save_my_profile(
      '{"id":"71000000-0000-0000-0000-000000000004","prenom":"Out of range","age":101}'::jsonb,
      '{"profile_age":101}'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'save_rpc_accepted_age_over_100'; end if;

  v_rejected := false;
  begin
    perform public.save_my_profile(
      '{"id":"71000000-0000-0000-0000-000000000004","prenom":"Mismatch","age":25}'::jsonb,
      '{"profile_age":24}'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'save_rpc_accepted_mismatched_age'; end if;
end
$test$;

rollback;
