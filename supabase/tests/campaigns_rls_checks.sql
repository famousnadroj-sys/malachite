begin;
do $$
begin
 if not (select relrowsecurity from pg_class where oid='public.campagnes'::regclass) then raise exception 'campaign_rls_disabled'; end if;
 if (select count(*) from pg_policy where polrelid='public.campagnes'::regclass and polname in ('campagnes_public_read_active','campagnes_admin_insert','campagnes_admin_update','campagnes_admin_delete'))<>4 then raise exception 'campaign_policy_set_incomplete'; end if;
 if not has_table_privilege('authenticated','public.campagnes','select') or not has_table_privilege('authenticated','public.campagnes','insert') or not has_table_privilege('authenticated','public.campagnes','update') or not has_table_privilege('authenticated','public.campagnes','delete') then raise exception 'campaign_authenticated_grants_missing'; end if;
 if has_table_privilege('anon','public.campagnes','select') then raise exception 'campaign_anon_access_must_not_be_granted'; end if;
end
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
select set_config('test.is_admin','false',true);
do $member$
begin
 if (select count(*) from public.campagnes)<>1 then raise exception 'member_must_see_only_active_campaign'; end if;
 begin
  insert into public.campagnes(id,titre,description,image_path,statut,debut,cree_par,media_type,placement)
  values ('80000000-0000-0000-0000-000000000004','unauthorized','x','x.png','active',now(),'90000000-0000-0000-0000-000000000001','image','discover');
  raise exception 'non_admin_campaign_insert_should_fail';
 exception when insufficient_privilege then null;
 end;
end
$member$;
select set_config('test.is_admin','true',true);
do $admin$
begin
 insert into public.campagnes(id,titre,description,image_path,statut,debut,cree_par,media_type,placement)
 values ('80000000-0000-0000-0000-000000000005','admin','x','x.png','active',now(),'90000000-0000-0000-0000-000000000001','image','discover');
 update public.campagnes set titre='updated' where id='80000000-0000-0000-0000-000000000005';
 delete from public.campagnes where id='80000000-0000-0000-0000-000000000005';
end
$admin$;
reset role;
rollback;
