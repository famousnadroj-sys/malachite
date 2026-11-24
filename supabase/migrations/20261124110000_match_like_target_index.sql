-- Cover the target-side foreign key used by cascades and target lookups.
create index if not exists match_daily_like_events_target_id_idx
  on private.match_daily_like_events (target_id);
