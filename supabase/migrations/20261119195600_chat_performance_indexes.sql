-- Speed up the two-direction conversation timeline query and recent-message lookup.
-- These indexes preserve the existing RLS policies and message visibility rules.
create index if not exists messages_de_a_id_idx
  on public.messages (de, a, id);

create index if not exists messages_a_de_id_idx
  on public.messages (a, de, id);

create index if not exists messages_created_at_desc_idx
  on public.messages (created_at desc);
