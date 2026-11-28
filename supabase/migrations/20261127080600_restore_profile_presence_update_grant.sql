-- Keep profile reads available while limiting direct client writes to last-seen.
-- Profile data, privacy, preferences and avatars are written only through validated RPCs.
revoke all privileges on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (derniere_vue) on table public.profiles to authenticated;
