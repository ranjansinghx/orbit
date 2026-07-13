-- =========================================================================
-- Orbit — watch time tracking
-- Run this after 0001_init.sql and 0002_features.sql.
-- =========================================================================

alter table public.posts
  add column if not exists watch_sample_count int not null default 0;

-- Records one viewer's watch-completion ratio (0..1) for a video post as a
-- running average, so `watch_time_ratio` (used by the For You ranking
-- function) reflects real playback data instead of always being 0.
create or replace function public.record_watch_time(p_post_id uuid, p_ratio numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare
  clamped numeric := greatest(0, least(1, p_ratio));
begin
  update public.posts
  set
    watch_time_ratio = ((watch_time_ratio * watch_sample_count) + clamped) / (watch_sample_count + 1),
    watch_sample_count = watch_sample_count + 1
  where id = p_post_id and type = 'video';
end;
$$;
