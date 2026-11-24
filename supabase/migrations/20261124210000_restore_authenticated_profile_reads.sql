-- The web client loads the visible profile directory directly from public.profiles.
-- RLS remains the authority for which rows an authenticated member may see.
grant select on public.profiles to authenticated;
