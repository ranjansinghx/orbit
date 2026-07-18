-- =========================================================================
-- Orbit — threaded comment replies + comment likes
-- Run this AFTER 0012_mutes.sql.
-- =========================================================================

alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists reply_count int not null default 0;
alter table public.comments add column if not exists like_count int not null default 0;

create index if not exists comments_parent_idx on public.comments (parent_comment_id, created_at);

-- Bumps the parent comment's reply_count when a reply is added/removed.
-- (Top-level comment counting against the post is unchanged — that's the
-- existing bump_comment_count trigger, and it already fires for replies too
-- since they're still rows in `comments`, which keeps "N comments" on a
-- post meaning "every comment and reply", matching the badge count.)
create or replace function public.bump_comment_reply_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_comment_id is not null then
      update public.comments set reply_count = reply_count + 1 where id = new.parent_comment_id;
      if (select author_id from public.comments where id = new.parent_comment_id) <> new.author_id then
        insert into public.notifications (user_id, type, actor_id, post_id)
        values ((select author_id from public.comments where id = new.parent_comment_id), 'comment', new.author_id, new.post_id);
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.parent_comment_id is not null then
      update public.comments set reply_count = greatest(reply_count - 1, 0) where id = old.parent_comment_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_comment_reply_change
  after insert or delete on public.comments
  for each row execute function public.bump_comment_reply_count();

-- ---------------------------------------------------------------------
-- Comment likes
-- ---------------------------------------------------------------------
create table public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

alter table public.comment_likes enable row level security;

create policy "comment likes are readable by everyone"
  on public.comment_likes for select using (true);
create policy "users can like comments as themselves"
  on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "users can unlike comments as themselves"
  on public.comment_likes for delete using (auth.uid() = user_id);

create or replace function public.bump_comment_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
    if (select author_id from public.comments where id = new.comment_id) <> new.user_id then
      insert into public.notifications (user_id, type, actor_id, post_id)
      select author_id, 'like', new.user_id, post_id from public.comments where id = new.comment_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_comment_like_change
  after insert or delete on public.comment_likes
  for each row execute function public.bump_comment_like_count();

create or replace function public.toggle_comment_like(p_comment_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.comment_likes where user_id = auth.uid() and comment_id = p_comment_id) into already;
  if already then
    delete from public.comment_likes where user_id = auth.uid() and comment_id = p_comment_id;
    return false;
  else
    insert into public.comment_likes (user_id, comment_id) values (auth.uid(), p_comment_id);
    return true;
  end if;
end;
$$;

alter publication supabase_realtime add table public.comment_likes;
