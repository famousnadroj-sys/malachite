-- MALACHITE has no advertising or sponsored campaigns at launch.
-- Remove inherited client grants as defense in depth; RLS without policies
-- already denies row access, but direct table privileges are unnecessary.
revoke all privileges on table public.campagnes from anon, authenticated;
