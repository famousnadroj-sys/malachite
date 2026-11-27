-- Signed Storage URLs are bearer tokens, not durable profile data.
-- Preserve the durable object path and remove only the transient URL.
update public.profiles
set avatar = avatar - 'imageUrl'
where jsonb_typeof(avatar) = 'object'
  and coalesce(avatar->>'imageUrl','') like '%/storage/v1/object/sign/%';
