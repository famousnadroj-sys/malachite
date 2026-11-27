-- The campaigns table currently has RLS enabled but no policies and is not
-- referenced by the shipped client. Remove stale direct API grants rather than
-- leaving a future policy change to silently expose unrestricted CRUD.
revoke all privileges on table public.campagnes from anon, authenticated;