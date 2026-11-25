begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001');
insert into public.profiles(id,prenom) values
 ('10000000-0000-0000-0000-000000000001','Sender'),
 ('20000000-0000-0000-0000-000000000001','Recipient');
insert into public.messages(id,de,a,texte) values (101,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','hello');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into public.message_receipts(message_id,sender_id,recipient_id,delivered_at)
values (101,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',now());
update public.message_receipts set read_at=now() where message_id=101 and recipient_id=auth.uid() and read_at is null;
do $$ begin
 if not exists(select 1 from public.message_receipts where message_id=101 and read_at is not null) then raise exception 'recipient_read_ack_failed'; end if;
 if has_column_privilege('authenticated','public.message_receipts','sender_id','UPDATE') then raise exception 'receipt_identity_mutable'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.message_receipts)<>1 then raise exception 'sender_cannot_read_receipt'; end if;
end $$;
reset role;
insert into public.blocages values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.message_receipts) then raise exception 'blocked_receipt_visible'; end if;
end $$;
reset role;
rollback;
