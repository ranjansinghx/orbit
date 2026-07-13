-- =========================================================================
-- Orbit — notification preferences + reporting
-- Run this after 0001_init.sql, 0002_features.sql, and 0003_watch_time.sql.
-- =========================================================================

-- ---------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  new_post boolean not null default true
);

alter table public.notification_preferences enable row level security;

create policy "users can read their own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "users can update their own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id);

create policy "users can insert their own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

-- Give every existing profile a default row so the checks below never have
-- to special-case "no row yet" as anything other than "everything on".
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- New signups get one too. Re-defines the same trigger function from
-- 0001_init.sql with this added, rather than a second trigger, so the two
-- inserts (profile + preferences) happen atomically in one trigger call.
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

  insert into public.notification_preferences (user_id) values (new.id);

  return new;
end;
$$;

-- Returns whether p_user_id wants a notification of p_kind
-- ('likes' | 'comments' | 'follows' | 'new_post'). Defaults to true if,
-- for any reason, no preferences row exists yet.
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
      else true
    end,
    true
  );
$$;

-- Re-define the notification-emitting triggers to respect preferences.
create or replace function public.bump_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    if (select author_id from public.posts where id = new.post_id) <> new.author_id
       and public.should_notify((select author_id from public.posts where id = new.post_id), 'comments') then
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

create or replace function public.bump_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    if (select author_id from public.posts where id = new.post_id) <> new.user_id
       and public.should_notify((select author_id from public.posts where id = new.post_id), 'likes') then
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
    if public.should_notify(p_target_id, 'follows') then
      insert into public.notifications (user_id, type, actor_id) values (p_target_id, 'follow', auth.uid());
    end if;
    return true;
  end if;
end;
$$;

create or replace function public.notify_followers_new_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, actor_id, post_id)
  select follower_id, 'new_post', new.author_id, new.id
  from public.follows
  where followee_id = new.author_id
    and public.should_notify(follower_id, 'new_post');
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- reports — separate from block: flags content for review rather than
-- just hiding it from the reporter. No client-facing select policy on
-- purpose; review happens via the Supabase dashboard or a service-role
-- admin tool, not the app itself.
-- ---------------------------------------------------------------------
create type public.report_target_type as enum ('post', 'user');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  status text not null default 'open'
);

create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

create policy "users can file reports as themselves"
  on public.reports for insert
  with check (auth.uid() = reporter_id);
