-- Malachite paid Jitsi calls and realtime call signaling.
-- Additive migration: preserves existing messages, profiles, payments and subscriptions.

drop policy if exists "declarer un paiement" on public.paiements;
create policy "declarer un paiement" on public.paiements
for insert to authenticated
with check (
 user_id = (select auth.uid()) and statut = 'attente'
 and offre = any(array['Premium','Boost','Badge Vérifié','Contact','Appels'])
 and char_length(btrim(code)) between 4 and 100
 and (
   (offre='Contact' and cible is not null and cible <> (select auth.uid()) and exists(select 1 from public.profiles p where p.id=paiements.cible))
   or (offre<>'Contact' and cible is null)
 )
);

create or replace function private.traiter_paiement(pid bigint, accepter boolean)
returns text language plpgsql security definer set search_path = ''
as $function$
declare p public.paiements%rowtype;
begin
 if not private.is_admin() then raise exception 'interdit'; end if;
 select * into p from public.paiements where id=pid and statut='attente' for update;
 if not found then return 'introuvable'; end if;
 if p.offre not in ('Premium','Boost','Badge Vérifié','Contact','Appels') then raise exception 'offre_invalide'; end if;
 if p.offre='Contact' and (p.cible is null or p.cible=p.user_id or not exists(select 1 from public.profiles where id=p.cible)) then
  raise exception 'cible_invalide';
 end if;
 if not accepter then
  update public.paiements set statut='rejete' where id=pid;
  insert into public.admin_actions(admin_id,action,cible,details)
  values ((select auth.uid()),'paiement_rejete',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre));
  return 'rejete';
 end if;
 insert into public.statuts(user_id) values(p.user_id) on conflict do nothing;
 if p.offre='Premium' then
  update public.statuts set premium_until=greatest(coalesce(premium_until,now()),now())+interval '30 days' where user_id=p.user_id;
 elsif p.offre='Boost' then
  update public.statuts set boost_until=greatest(coalesce(boost_until,now()),now())+interval '1 day' where user_id=p.user_id;
 elsif p.offre='Badge Vérifié' then
  update public.statuts set verified_until=greatest(coalesce(verified_until,now()),now())+interval '14 days' where user_id=p.user_id;
 elsif p.offre='Contact' then
  insert into public.deblocages(user_id,cible) values(p.user_id,p.cible) on conflict do nothing;
 elsif p.offre='Appels' then
  null; -- Validated payment timestamp grants the 30-day pass.
 end if;
 update public.paiements set statut='valide' where id=pid;
 insert into public.admin_actions(admin_id,action,cible,details)
 values ((select auth.uid()),'paiement_valide',p.user_id,jsonb_build_object('paiement',pid,'offre',p.offre));
 return 'ok';
end
$function$;

create table if not exists public.call_sessions(
 id uuid primary key default gen_random_uuid(),
 caller_id uuid not null references auth.users(id) on delete cascade,
 callee_id uuid not null references auth.users(id) on delete cascade,
 room text not null unique,
 mode text not null check(mode in ('audio','video')),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','ended','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '90 seconds'),
 ended_at timestamptz,
 constraint call_sessions_distinct_members check(caller_id<>callee_id)
);
create index if not exists call_sessions_caller_created_idx on public.call_sessions(caller_id,created_at desc);
create index if not exists call_sessions_callee_created_idx on public.call_sessions(callee_id,created_at desc);
alter table public.call_sessions enable row level security;
grant select,insert,update on public.call_sessions to authenticated;
drop policy if exists "call participants can read" on public.call_sessions;
create policy "call participants can read" on public.call_sessions for select to authenticated
using(auth.uid()=caller_id or auth.uid()=callee_id);
drop policy if exists "paid matched members can call" on public.call_sessions;
create policy "paid matched members can call" on public.call_sessions for insert to authenticated
with check(
 auth.uid()=caller_id and status='pending' and expires_at>now() and expires_at<=now()+interval '3 minutes'
 and exists(select 1 from public.paiements pay where pay.user_id=auth.uid() and pay.offre='Appels' and pay.statut='valide' and pay.created_at>=now()-interval '30 days')
 and exists(select 1 from public.avis_match a where a.user_id=auth.uid() and a.autre=callee_id and a.ok=true)
 and exists(select 1 from public.avis_match a where a.user_id=callee_id and a.autre=auth.uid() and a.ok=true)
);
drop policy if exists "call participants can update" on public.call_sessions;
create policy "call participants can update" on public.call_sessions for update to authenticated
using(auth.uid()=caller_id or auth.uid()=callee_id)
with check(auth.uid()=caller_id or auth.uid()=callee_id);

create or replace function private.guard_call_session_update()
returns trigger language plpgsql set search_path=''
as $$
begin
 if new.caller_id<>old.caller_id or new.callee_id<>old.callee_id or new.room<>old.room or new.mode<>old.mode or new.created_at<>old.created_at then
  raise exception 'call_session_immutable_fields';
 end if;
 if old.status in ('rejected','ended','expired') then raise exception 'call_session_closed'; end if;
 if old.status='pending' and new.status not in ('accepted','rejected','ended','expired') then raise exception 'invalid_call_transition'; end if;
 if old.status='accepted' and new.status<>'ended' then raise exception 'invalid_call_transition'; end if;
 if auth.uid()=old.caller_id and new.status in ('accepted','rejected') then raise exception 'only_callee_can_answer'; end if;
 if auth.uid()=old.callee_id and new.status='expired' then raise exception 'callee_cannot_expire_call'; end if;
 if new.status in ('ended','rejected','expired') then new.ended_at=now(); end if;
 return new;
end $$;
drop trigger if exists guard_call_session_update on public.call_sessions;
create trigger guard_call_session_update before update on public.call_sessions
for each row execute function private.guard_call_session_update();

do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_sessions') then
  alter publication supabase_realtime add table public.call_sessions;
 end if;
end $$;
