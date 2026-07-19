-- =========================================================================
-- Orbit — per-post audience control, reply permissions, close friends
-- Run this AFTER 0017_group_dms.sql.
-- =========================================================================

create type public.post_audience as enum ('everyone', 'followers', 'close_friends');
create type public.reply_permission as enum ('everyone', 'followers', 'mentioned');

alter table public.posts add column if not exists audience public.post_audience not null default 'everyone';
alter table public.posts add column if not exists reply_permission public.reply_permission not null default 'everyone';

-- ---------------------------------------------------------------------
-- Close friends: a fully private list only its owner can ever read —
-- not even the person on the list can see they're on it, matching how
-- this pattern works elsewhere.
-- ---------------------------------------------------------------------
create table public.close_friends (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);

alter table public.close_friends enable row level security;

create policy "only the owner can see their close friends list"
  on public.close_friends for select using (auth.uid() = owner_id);
create policy "only the owner can add to their close friends list"
  on public.close_friends for insert with check (auth.uid() = owner_id);
create policy "only the owner can remove from their close friends list"
  on public.close_friends for delete using (auth.uid() = owner_id);

create or replace function public.toggle_close_friend(p_friend_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  already boolean;
begin
  select exists(select 1 from public.close_friends where owner_id = auth.uid() and friend_id = p_friend_id) into already;
  if already then
    delete from public.close_friends where owner_id = auth.uid() and friend_id = p_friend_id;
    return false;
  else
    insert into public.close_friends (owner_id, friend_id) values (auth.uid(), p_friend_id);
    return true;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- posts RLS, extended to cover per-post audience on top of the existing
-- account-level privacy check from 0016.
-- ---------------------------------------------------------------------
drop policy if exists "posts are readable respecting account privacy" on public.posts;

create policy "posts are readable respecting audience and account privacy"
  on public.posts for select using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin)
    or (
      -- account-level privacy gate (unchanged from 0016)
      (
        not exists (select 1 from public.profiles pr where pr.id = author_id and pr.is_private)
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followee_id = author_id and f.status = 'accepted'
        )
      )
      and (
        -- then the per-post audience gate on top
        audience = 'everyone'
        or (
          audience = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followee_id = author_id and f.status = 'accepted'
          )
        )
        or (
          audience = 'close_friends'
          and exists (
            select 1 from public.close_friends cf
            where cf.owner_id = author_id and cf.friend_id = auth.uid()
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------
-- comments RLS, extended so a post's reply_permission is actually
-- enforced, not just decorative.
-- ---------------------------------------------------------------------
drop policy if exists "users can comment as themselves" on public.comments;

create policy "users can comment respecting the post's reply permission"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.author_id = auth.uid()
          or p.reply_permission = 'everyone'
          or (
            p.reply_permission = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid() and f.followee_id = p.author_id and f.status = 'accepted'
            )
          )
          or (
            p.reply_permission = 'mentioned'
            and auth.uid() in (select public.extract_mentioned_user_ids(p.caption))
          )
        )
    )
  );

create or replace function public.set_post_audience(p_post_id uuid, p_audience public.post_audience)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.posts set audience = p_audience where id = p_post_id and author_id = auth.uid();
end;
$$;

create or replace function public.set_post_reply_permission(p_post_id uuid, p_permission public.reply_permission)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.posts set reply_permission = p_permission where id = p_post_id and author_id = auth.uid();
end;
$$;
