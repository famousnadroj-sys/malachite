-- The browser profile viewer selects these display columns for other members.
-- Previous column-level grants omitted them, causing the entire PostgREST SELECT
-- to fail with 403 even when the profile row existed.
-- Keep private contact details and preference data out of the public profile grant.
grant select (username, quartier, avatar, profile_private)
  on table public.profiles to authenticated;

-- Presence uses the existing derniere_vue timestamp. No extra table or paid service
-- is needed; the browser writes only its own timestamp under the existing RLS policy.
