-- =========================================================================
-- Orbit — mutes
-- Unlike a block, a mute is silent and one-directional: the muted person
-- keeps following/being followed and is never notified. It just hides
-- their posts/reposts from your own feeds and their new-post notifications.
-- Run this AFTER 0011_admin_and_onboarding.sql.
-- =========================================================================

create table public.mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  check (user_id <> muted_id)
);

alter table public.mutes enable row level security;

create policy "users can view their own mutes"
  on public.mutes for select using (auth.uid() = user_id);
create policy "users can mute as themselves"
  on public.mutes for insert with check (auth.uid() = user_id);
create policy "users can unmute as themselves"
  on public.mutes for delete using (auth.uid() = user_id);

create or replace function public.toggle_mute(p_target_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.mutes where user_id = auth.uid() and muted_id = p_target_id) into already;
  if already then
    delete from public.mutes where user_id = auth.uid() and muted_id = p_target_id;
    return false;
  else
    insert into public.mutes (user_id, muted_id) values (auth.uid(), p_target_id);
    return true;
  end if;
end;
$$;

-- Exclude muted authors from the viewer's own For You feed (one-directional,
-- unlike blocks — the muted user isn't affected on their end at all).
create or replace function public.get_for_you_feed(
  p_viewer_id uuid,
  p_cursor_score double precision default null,
  p_cursor_id uuid default null,
  p_limit int default 10
)
returns table (
  id uuid,
  author_id uuid,
  type public.post_type,
  media_urls text[],
  caption text,
  created_at timestamptz,
  view_count int,
  like_count int,
  comment_count int,
  share_count int,
  watch_time_ratio numeric,
  score double precision
)
language sql stable as $$
  with scored as (
    select
      p.*,
      (
        p.like_count * 1
        + p.comment_count * 2
        + p.share_count * 3
        + p.watch_time_ratio * 5 * 100
        - (extract(epoch from (now() - p.created_at)) / 3600.0) * 0.12
      ) * (case when exists (
            select 1 from public.follows f
            where f.follower_id = p_viewer_id and f.followee_id = p.author_id
          ) then 1.15 else 1 end) as score
    from public.posts p
    where p.type in ('video', 'photo')
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = p_viewer_id and b.blocked_id = p.author_id)
           or (b.blocker_id = p.author_id and b.blocked_id = p_viewer_id)
      )
      and not exists (
        select 1 from public.mutes m
        where m.user_id = p_viewer_id and m.muted_id = p.author_id
      )
  )
  select id, author_id, type, media_urls, caption, created_at,
         view_count, like_count, comment_count, share_count, watch_time_ratio, score
  from scored
  where p_cursor_score is null
     or (score, id) < (p_cursor_score, p_cursor_id)
  order by score desc, id desc
  limit p_limit;
$$;

-- Same exclusion for the Following feed (originals and reposts alike).
create or replace function public.get_following_feed(
  p_viewer_id uuid,
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 10
)
returns table (
  id uuid,
  author_id uuid,
  type public.post_type,
  media_urls text[],
  caption text,
  created_at timestamptz,
  view_count int,
  like_count int,
  comment_count int,
  share_count int,
  repost_count int,
  watch_time_ratio numeric,
  effective_time timestamptz,
  reposted_by uuid
)
language sql stable as $$
  with combined as (
    select
      p.id, p.author_id, p.type, p.media_urls, p.caption, p.created_at,
      p.view_count, p.like_count, p.comment_count, p.share_count, p.repost_count, p.watch_time_ratio,
      p.created_at as effective_time,
      null::uuid as reposted_by
    from public.posts p
    where p.type = 'text'
      and p.author_id in (select followee_id from public.follows where follower_id = p_viewer_id)
      and not exists (select 1 from public.mutes m where m.user_id = p_viewer_id and m.muted_id = p.author_id)

    union all

    select
      p.id, p.author_id, p.type, p.media_urls, p.caption, p.created_at,
      p.view_count, p.like_count, p.comment_count, p.share_count, p.repost_count, p.watch_time_ratio,
      r.created_at as effective_time,
      r.user_id as reposted_by
    from public.reposts r
    join public.posts p on p.id = r.post_id
    where p.type = 'text'
      and r.user_id in (select followee_id from public.follows where follower_id = p_viewer_id)
      and not exists (select 1 from public.mutes m where m.user_id = p_viewer_id and m.muted_id = r.user_id)
  )
  select id, author_id, type, media_urls, caption, created_at,
         view_count, like_count, comment_count, share_count, repost_count, watch_time_ratio,
         effective_time, reposted_by
  from combined
  where p_cursor_ts is null or (effective_time, id) < (p_cursor_ts, p_cursor_id)
  order by effective_time desc, id desc
  limit p_limit;
$$;
