-- Remove any broad table-level SELECT grant first. RLS controls rows, but
-- column privileges also matter: do not expose profiles.prefs to other members.
revoke select on table public.profiles from authenticated;

-- The browser profile viewer selects these public display columns for other members.
-- Previous column-level grants omitted some fields, causing the complete PostgREST
-- SELECT to fail even when the profile row existed.
grant select (id, username, prenom, age, genre, commune, quartier, profession,
              bio, interets, photos, created_at, prompts, derniere_vue,
              avatar, profile_private)
  on table public.profiles to authenticated;

-- Presence uses the existing derniere_vue timestamp. No extra table or paid service
-- is needed; the browser writes only its own timestamp under the existing RLS policy.
