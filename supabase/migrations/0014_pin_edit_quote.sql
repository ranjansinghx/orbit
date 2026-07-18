-- =========================================================================
-- Orbit — pinned posts, "edited" indicator, quote-reposts
-- Run this AFTER 0013_comment_threads.sql.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Pinned post (one per profile, must be your own post)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists pinned_post_id uuid references public.posts(id) on delete set null;

create or replace function public.enforce_pinned_post_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pinned_post_id is not null then
    if not exists (select 1 from public.posts where id = new.pinned_post_id and author_id = new.id) then
      raise exception 'invalid_pin: you can only pin your own posts';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists before_profile_update_pin_check on public.profiles;
create trigger before_profile_update_pin_check
  before update of pinned_post_id on public.profiles
  for each row execute function public.enforce_pinned_post_ownership();

create or replace function public.set_pinned_post(p_post_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_post_id is not null and not exists (select 1 from public.posts where id = p_post_id and author_id = auth.uid()) then
    raise exception 'invalid_pin: you can only pin your own posts';
  end if;
  update public.profiles set pinned_post_id = p_post_id where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- "Edited" indicator
-- ---------------------------------------------------------------------
alter table public.posts add column if not exists edited_at timestamptz;

create or replace function public.stamp_post_edited()
returns trigger language plpgsql as $$
begin
  if new.caption is distinct from old.caption then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists before_post_update_stamp_edited on public.posts;
create trigger before_post_update_stamp_edited
  before update of caption on public.posts
  for each row execute function public.stamp_post_edited();

-- ---------------------------------------------------------------------
-- Quote-reposts: an optional comment attached to a repost
-- ---------------------------------------------------------------------
alter table public.reposts add column if not exists quote text;

create or replace function public.toggle_repost(p_post_id uuid, p_quote text default null)
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
    insert into public.reposts (user_id, post_id, quote) values (auth.uid(), p_post_id, nullif(trim(p_quote), ''));
    return true;
  end if;
end;
$$;

-- Following feed, now carrying the quote text through.
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
      and p.author_id in (select followee_id from public.follows where follower_id = p_viewer_id)
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
      and r.user_id in (select followee_id from public.follows where follower_id = p_viewer_id)
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
