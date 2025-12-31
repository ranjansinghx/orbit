-- =========================================================================
-- Orbit — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push` /
-- `supabase migration up` if you're using the Supabase CLI.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
-- Username: prefer metadata (set at sign-up time), else derive from email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_.]', '', 'g');
  if base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', base_username),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "follows are readable by everyone"
  on public.follows for select
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "users can unfollow as themselves"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------
create type public.post_type as enum ('video', 'photo', 'text');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type public.post_type not null,
  media_urls text[] not null default '{}',
  caption text not null default '',
  created_at timestamptz not null default now(),
  view_count int not null default 0,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  watch_time_ratio numeric not null default 0,
  check (type = 'text' or array_length(media_urls, 1) > 0)
);

create index posts_type_created_idx on public.posts (type, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

create policy "posts are readable by everyone"
  on public.posts for select
  using (true);

create policy "users can create their own posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "users can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- ---------------------------------------------------------------------
-- hashtags
-- ---------------------------------------------------------------------
create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null
);

create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;

create policy "hashtags are readable by everyone"
  on public.hashtags for select using (true);
create policy "authenticated users can create hashtags"
  on public.hashtags for insert to authenticated with check (true);

create policy "post_hashtags are readable by everyone"
  on public.post_hashtags for select using (true);
create policy "post authors can tag their own posts"
  on public.post_hashtags for insert
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- Parses #tags out of a caption, upserts hashtags, links them to the post.
create or replace function public.sync_post_hashtags()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  tag text;
  h_id uuid;
begin
  delete from public.post_hashtags where post_id = new.id;
  for tag in
    select lower(m[1]) from regexp_matches(new.caption, '#([a-zA-Z0-9_]+)', 'g') as m
  loop
    insert into public.hashtags (tag) values (tag)
      on conflict (tag) do update set tag = excluded.tag
      returning id into h_id;
    insert into public.post_hashtags (post_id, hashtag_id) values (new.id, h_id)
      on conflict do nothing;
  end loop;
  return new;
end;
$$;

create trigger on_post_upsert_sync_hashtags
  after insert or update of caption on public.posts
  for each row execute function public.sync_post_hashtags();

-- ---------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at desc);

alter table public.comments enable row level security;

create policy "comments are readable by everyone"
  on public.comments for select using (true);
create policy "users can comment as themselves"
  on public.comments for insert with check (auth.uid() = author_id);
create policy "users can delete their own comments"
  on public.comments for delete using (auth.uid() = author_id);

create or replace function public.bump_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    if (select author_id from public.posts where id = new.post_id) <> new.author_id then
      insert into public.notifications (user_id, type, actor_id, post_id)
      values ((select author_id from public.posts where id = new.post_id), 'comment', new.author_id, new.post_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.bump_comment_count();

-- ---------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.likes enable row level security;

create policy "likes are readable by everyone"
  on public.likes for select using (true);
create policy "users can like as themselves"
  on public.likes for insert with check (auth.uid() = user_id);
create policy "users can unlike as themselves"
  on public.likes for delete using (auth.uid() = user_id);

create or replace function public.bump_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    if (select author_id from public.posts where id = new.post_id) <> new.user_id then
      insert into public.notifications (user_id, type, actor_id, post_id)
      values ((select author_id from public.posts where id = new.post_id), 'like', new.user_id, new.post_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.bump_like_count();

-- Atomic toggle so the client doesn't need a select-then-branch round trip.
create or replace function public.toggle_like(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
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

create or replace function public.toggle_follow(p_target_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.follows where follower_id = auth.uid() and followee_id = p_target_id) into already;
  if already then
    delete from public.follows where follower_id = auth.uid() and followee_id = p_target_id;
    return false;
  else
    insert into public.follows (follower_id, followee_id) values (auth.uid(), p_target_id);
    insert into public.notifications (user_id, type, actor_id) values (p_target_id, 'follow', auth.uid());
    return true;
  end if;
end;
$$;

create or replace function public.increment_view_count(p_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.posts set view_count = view_count + 1 where id = p_post_id;
$$;

create or replace function public.increment_share_count(p_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.posts set share_count = share_count + 1 where id = p_post_id;
$$;

-- ---------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (user_a_id, user_b_id)
);

alter table public.conversations enable row level security;

create policy "participants can read their conversations"
  on public.conversations for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "users can start a conversation they're part of"
  on public.conversations for insert
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Returns (creating if needed) the single conversation id between two users,
-- regardless of which order they're passed in — the unique constraint above
-- only catches one ordering, so this normalizes it.
create or replace function public.get_or_create_conversation(p_other_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
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

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_url text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  check (body is not null or media_url is not null)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "recipients can mark messages read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create or replace function public.bump_conversation_timestamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.messages set delivered_at = now() where id = new.id;
  return new;
end;
$$;

create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.bump_conversation_timestamp();

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create type public.notification_type as enum ('like', 'comment', 'follow', 'new_post');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read their own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users can mark their own notifications read"
  on public.notifications for update using (auth.uid() = user_id);
-- Inserts happen only via the security-definer trigger functions above,
-- so no insert policy is granted to regular clients.

-- Fan out a "new_post" notification to followers when someone posts.
create or replace function public.notify_followers_new_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id, post_id)
  select follower_id, 'new_post', new.author_id, new.id
  from public.follows
  where followee_id = new.author_id;
  return new;
end;
$$;

create trigger on_post_insert_notify_followers
  after insert on public.posts
  for each row execute function public.notify_followers_new_post();

-- ---------------------------------------------------------------------
-- For You ranking, server-side, with cursor pagination
-- score = likes*1 + comments*2 + shares*3 + watch_time_ratio*5*100
--         - age_in_hours*0.12, x1.15 if the viewer follows the author
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
            where f.follower_id = p_viewer_id and f.followee_id = p.author_id
          ) then 1.15 else 1 end) as score
    from public.posts p
    where p.type in ('video', 'photo')
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
-- Hashtag counts, for the search page's trending list
-- ---------------------------------------------------------------------
create view public.hashtag_counts as
  select h.tag, count(ph.post_id) as post_count
  from public.hashtags h
  join public.post_hashtags ph on ph.hashtag_id = h.id
  group by h.tag
  order by post_count desc;

-- ---------------------------------------------------------------------
-- Realtime: messages and notifications need to stream to clients
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;

-- ---------------------------------------------------------------------
-- Storage bucket for post media + message attachments
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "authenticated users can upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete their own media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
