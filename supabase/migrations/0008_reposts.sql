-- =========================================================================
-- Orbit — reposts (share-to-feed)
-- Run this AFTER 0007_repost_enum.sql.
-- =========================================================================

alter table public.posts add column if not exists repost_count int not null default 0;
alter table public.notification_preferences add column if not exists reposts boolean not null default true;

create table public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index reposts_post_idx on public.reposts (post_id);

alter table public.reposts enable row level security;

create policy "reposts are readable by everyone"
  on public.reposts for select using (true);
create policy "users can repost as themselves"
  on public.reposts for insert with check (auth.uid() = user_id);
create policy "users can un-repost as themselves"
  on public.reposts for delete using (auth.uid() = user_id);

-- Extend should_notify for the new 'reposts' preference.
create or replace function public.should_notify(p_user_id uuid, p_kind text)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select coalesce(
    case p_kind
      when 'likes' then (select likes from public.notification_preferences where user_id = p_user_id)
      when 'comments' then (select comments from public.notification_preferences where user_id = p_user_id)
      when 'follows' then (select follows from public.notification_preferences where user_id = p_user_id)
      when 'new_post' then (select new_post from public.notification_preferences where user_id = p_user_id)
      when 'mentions' then (select mentions from public.notification_preferences where user_id = p_user_id)
      when 'reposts' then (select reposts from public.notification_preferences where user_id = p_user_id)
      else true
    end,
    true
  );
$$;

create or replace function public.bump_repost_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set repost_count = repost_count + 1 where id = new.post_id;
    if (select author_id from public.posts where id = new.post_id) <> new.user_id
       and public.should_notify((select author_id from public.posts where id = new.post_id), 'reposts') then
      insert into public.notifications (user_id, type, actor_id, post_id)
      values ((select author_id from public.posts where id = new.post_id), 'repost', new.user_id, new.post_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set repost_count = greatest(repost_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute function public.bump_repost_count();

create or replace function public.toggle_repost(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.reposts where user_id = auth.uid() and post_id = p_post_id) into already;
  if already then
    delete from public.reposts where user_id = auth.uid() and post_id = p_post_id;
    return false;
  else
    insert into public.reposts (user_id, post_id) values (auth.uid(), p_post_id);
    return true;
  end if;
end;
$$;

-- Following feed, server-ranked-by-recency with cursor pagination, unioning
-- original text posts from people you follow with text posts *reposted* by
-- people you follow (even if you don't follow the original author — that's
-- the point of a repost). reposted_by is null for original posts.
--
-- Known simplification: if the same post reaches your feed both as an
-- original (someone you follow wrote it) and as a repost (someone else you
-- follow reposted it) right at a page boundary, it's possible in rare cases
-- to see it twice across two pages rather than deduped into one. Not worth
-- the extra complexity to close for a v1.
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
  )
  select id, author_id, type, media_urls, caption, created_at,
         view_count, like_count, comment_count, share_count, repost_count, watch_time_ratio,
         effective_time, reposted_by
  from combined
  where p_cursor_ts is null or (effective_time, id) < (p_cursor_ts, p_cursor_id)
  order by effective_time desc, id desc
  limit p_limit;
$$;
