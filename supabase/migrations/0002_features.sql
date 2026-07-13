-- =========================================================================
-- Orbit — migration 2: rate limiting, block/mute, saved posts
-- Run this AFTER 0001_init.sql, in the Supabase SQL editor.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Rate limiting: posts (max 5 per 10 minutes) and comments (max 20/min)
-- ---------------------------------------------------------------------
create or replace function public.enforce_post_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.posts
  where author_id = new.author_id
    and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then
    raise exception 'rate_limit_exceeded: you can post up to 5 times per 10 minutes';
  end if;
  return new;
end;
$$;

drop trigger if exists before_post_insert_rate_limit on public.posts;
create trigger before_post_insert_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_post_rate_limit();

create or replace function public.enforce_comment_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.comments
  where author_id = new.author_id
    and created_at > now() - interval '1 minute';
  if recent_count >= 20 then
    raise exception 'rate_limit_exceeded: slow down on comments';
  end if;
  return new;
end;
$$;

drop trigger if exists before_comment_insert_rate_limit on public.comments;
create trigger before_comment_insert_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

-- Rate-limited version of toggle_like (max 60 new likes per minute per user)
create or replace function public.toggle_like(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
  recent_count int;
begin
  select count(*) into recent_count
  from public.likes
  where user_id = auth.uid() and created_at > now() - interval '1 minute';
  if recent_count >= 60 then
    raise exception 'rate_limit_exceeded: slow down on likes';
  end if;

  select exists(select 1 from public.likes where user_id = auth.uid() and post_id = p_post_id) into already;
  if already then
    delete from public.likes where user_id = auth.uid() and post_id = p_post_id;
    return false;
  else
    insert into public.likes (user_id, post_id) values (auth.uid(), p_post_id);
    return true;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Blocking
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "users can view their own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);
create policy "users can block as themselves"
  on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "users can unblock as themselves"
  on public.blocks for delete using (auth.uid() = blocker_id);

create or replace function public.toggle_block(p_target_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = p_target_id) into already;
  if already then
    delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target_id;
    return false;
  else
    insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), p_target_id);
    delete from public.follows
      where (follower_id = auth.uid() and followee_id = p_target_id)
         or (follower_id = p_target_id and followee_id = auth.uid());
    return true;
  end if;
end;
$$;

-- Can't follow someone you've blocked, or who has blocked you
create or replace function public.enforce_follow_block_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = new.follower_id and blocked_id = new.followee_id)
       or (blocker_id = new.followee_id and blocked_id = new.follower_id)
  ) then
    raise exception 'blocked: cannot follow this user';
  end if;
  return new;
end;
$$;

drop trigger if exists before_follow_insert_block_check on public.follows;
create trigger before_follow_insert_block_check
  before insert on public.follows
  for each row execute function public.enforce_follow_block_check();

-- Can't start a new conversation with someone you've blocked / been blocked by
create or replace function public.get_or_create_conversation(p_other_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = me and blocked_id = p_other_id)
       or (blocker_id = p_other_id and blocked_id = me)
  ) then
    raise exception 'blocked: cannot message this user';
  end if;

  select id into conv_id from public.conversations
    where (user_a_id = me and user_b_id = p_other_id)
       or (user_a_id = p_other_id and user_b_id = me)
    limit 1;
  if conv_id is not null then
    return conv_id;
  end if;
  insert into public.conversations (user_a_id, user_b_id) values (me, p_other_id)
    returning id into conv_id;
  return conv_id;
end;
$$;

-- Can't send further messages if a block happens after a conversation exists
create or replace function public.enforce_message_block_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other_id uuid;
begin
  select case when user_a_id = new.sender_id then user_b_id else user_a_id end
    into other_id
    from public.conversations where id = new.conversation_id;

  if exists (
    select 1 from public.blocks
    where (blocker_id = new.sender_id and blocked_id = other_id)
       or (blocker_id = other_id and blocked_id = new.sender_id)
  ) then
    raise exception 'blocked: cannot message this user';
  end if;
  return new;
end;
$$;

drop trigger if exists before_message_insert_block_check on public.messages;
create trigger before_message_insert_block_check
  before insert on public.messages
  for each row execute function public.enforce_message_block_check();

-- Exclude blocked-either-direction users from the ranked For You feed
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
  )
  select id, author_id, type, media_urls, caption, created_at,
         view_count, like_count, comment_count, share_count, watch_time_ratio, score
  from scored
  where p_cursor_score is null
     or (score, id) < (p_cursor_score, p_cursor_id)
  order by score desc, id desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------
-- Saved posts (bookmarks) — private to the saver, not shown to anyone else
-- ---------------------------------------------------------------------
create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy "users can view their own saved posts"
  on public.saved_posts for select using (auth.uid() = user_id);
create policy "users can save as themselves"
  on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "users can unsave as themselves"
  on public.saved_posts for delete using (auth.uid() = user_id);

create or replace function public.toggle_save(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.saved_posts where user_id = auth.uid() and post_id = p_post_id) into already;
  if already then
    delete from public.saved_posts where user_id = auth.uid() and post_id = p_post_id;
    return false;
  else
    insert into public.saved_posts (user_id, post_id) values (auth.uid(), p_post_id);
    return true;
  end if;
end;
$$;
