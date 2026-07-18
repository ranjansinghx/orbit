-- =========================================================================
-- Orbit — private/protected accounts + follow requests
-- Run this AFTER 0015_follow_request_enum.sql.
--
-- Enforcement lives at the RLS layer on `posts`, not in application code —
-- that means every read path (feeds, profile grids, hashtag pages, post
-- detail, search) is covered automatically, with no risk of a client-side
-- filter being missed somewhere.
-- =========================================================================

alter table public.profiles add column if not exists is_private boolean not null default false;
alter table public.follows add column if not exists status text not null default 'accepted' check (status in ('pending', 'accepted'));

-- ---------------------------------------------------------------------
-- follows RLS: pending requests are only visible to the two people
-- involved, not the whole world (unlike accepted follows, which stay
-- public — follower/following lists have always been public here).
-- ---------------------------------------------------------------------
drop policy if exists "follows are readable by everyone" on public.follows;

create policy "accepted follows are readable by everyone"
  on public.follows for select using (status = 'accepted');
create policy "pending follow requests are visible to participants"
  on public.follows for select using (
    status = 'pending' and (auth.uid() = follower_id or auth.uid() = followee_id)
  );
create policy "users can update follow rows they're the target of"
  on public.follows for update using (auth.uid() = followee_id);

-- ---------------------------------------------------------------------
-- posts RLS: hide a private account's posts from everyone except the
-- author and their accepted followers.
-- ---------------------------------------------------------------------
drop policy if exists "posts are readable by everyone" on public.posts;

create policy "posts are readable respecting account privacy"
  on public.posts for select using (
    not exists (select 1 from public.profiles pr where pr.id = author_id and pr.is_private)
    or author_id = auth.uid()
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followee_id = author_id and f.status = 'accepted'
    )
    or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin)
  );

-- ---------------------------------------------------------------------
-- toggle_follow now requests instead of following outright when the
-- target account is private. Return value stays boolean (true = a follow
-- row now exists, pending or accepted) to keep the existing client
-- contract; the client reads the row's `status` separately for the
-- Follow / Requested / Following distinction.
-- ---------------------------------------------------------------------
create or replace function public.toggle_follow(p_target_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  existing_status text;
  target_private boolean;
begin
  select status into existing_status from public.follows
    where follower_id = auth.uid() and followee_id = p_target_id;

  if existing_status is not null then
    delete from public.follows where follower_id = auth.uid() and followee_id = p_target_id;
    return false;
  end if;

  select is_private into target_private from public.profiles where id = p_target_id;

  if target_private then
    insert into public.follows (follower_id, followee_id, status) values (auth.uid(), p_target_id, 'pending');
    insert into public.notifications (user_id, type, actor_id) values (p_target_id, 'follow_request', auth.uid());
  else
    insert into public.follows (follower_id, followee_id, status) values (auth.uid(), p_target_id, 'accepted');
    insert into public.notifications (user_id, type, actor_id) values (p_target_id, 'follow', auth.uid());
  end if;
  return true;
end;
$$;

create or replace function public.accept_follow_request(p_follower_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.follows set status = 'accepted'
    where follower_id = p_follower_id and followee_id = auth.uid() and status = 'pending';
  if found then
    insert into public.notifications (user_id, type, actor_id) values (p_follower_id, 'follow', auth.uid());
  end if;
end;
$$;

create or replace function public.reject_follow_request(p_follower_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
    where follower_id = p_follower_id and followee_id = auth.uid() and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------
-- Ranking functions, updated so the follow-boost and Following feed only
-- consider *accepted* follows (a pending request to a private account
-- shouldn't boost or surface anything — and thanks to the posts RLS
-- policy above, it couldn't anyway, this just keeps the SQL honest).
-- ---------------------------------------------------------------------
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
            where f.follower_id = p_viewer_id and f.followee_id = p.author_id and f.status = 'accepted'
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
  edited_at timestamptz,
  effective_time timestamptz,
  reposted_by uuid,
  quote text
)
language sql stable as $$
  with combined as (
    select
      p.id, p.author_id, p.type, p.media_urls, p.caption, p.created_at,
      p.view_count, p.like_count, p.comment_count, p.share_count, p.repost_count, p.watch_time_ratio,
      p.edited_at,
      p.created_at as effective_time,
      null::uuid as reposted_by,
      null::text as quote
    from public.posts p
    where p.type = 'text'
      and p.author_id in (select followee_id from public.follows where follower_id = p_viewer_id and status = 'accepted')
      and not exists (select 1 from public.mutes m where m.user_id = p_viewer_id and m.muted_id = p.author_id)

    union all

    select
      p.id, p.author_id, p.type, p.media_urls, p.caption, p.created_at,
      p.view_count, p.like_count, p.comment_count, p.share_count, p.repost_count, p.watch_time_ratio,
      p.edited_at,
      r.created_at as effective_time,
      r.user_id as reposted_by,
      r.quote as quote
    from public.reposts r
    join public.posts p on p.id = r.post_id
    where p.type = 'text'
      and r.user_id in (select followee_id from public.follows where follower_id = p_viewer_id and status = 'accepted')
      and not exists (select 1 from public.mutes m where m.user_id = p_viewer_id and m.muted_id = r.user_id)
  )
  select id, author_id, type, media_urls, caption, created_at,
         view_count, like_count, comment_count, share_count, repost_count, watch_time_ratio,
         edited_at, effective_time, reposted_by, quote
  from combined
  where p_cursor_ts is null or (effective_time, id) < (p_cursor_ts, p_cursor_id)
  order by effective_time desc, id desc
  limit p_limit;
$$;
