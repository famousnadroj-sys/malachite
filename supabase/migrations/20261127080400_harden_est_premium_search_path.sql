-- Remove the mutable public schema from the SECURITY DEFINER function's
-- search path. Fully qualify the only relation it reads.
create or replace function public.est_premium(u uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.premium_until > now()
     from public.statuts s
     where s.user_id = u),
    false
  )
$$;
