-- Sponsored campaigns are retired from the Malachite launch scope.
-- RLS currently has no policies; remove stale browser grants as defense-in-depth.
revoke all on table public.campagnes from public, anon, authenticated;
