-- =========================================================================
-- Orbit — @mentions
-- Run this AFTER 0005_mention_enum.sql.
-- =========================================================================

alter table public.notification_preferences
  add column if not exists mentions boolean not null default true;

-- Extends should_notify (redefined from 0004_preferences_and_reports.sql)
-- to cover the new 'mentions' preference.
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
      else true
    end,
    true
  );
$$;

-- Resolves @username tokens in a block of text to the matching profile ids.
create or replace function public.extract_mentioned_user_ids(p_text text)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id
  from public.profiles p
  join (
    select distinct lower(m[1]) as uname
    from regexp_matches(coalesce(p_text, ''), '@([a-zA-Z0-9_.]+)', 'g') as m
  ) mentioned on mentioned.uname = p.username;
$$;

create or replace function public.notify_mentions_in_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  mentioned_id uuid;
begin
  for mentioned_id in select * from public.extract_mentioned_user_ids(new.caption) loop
    if mentioned_id <> new.author_id and public.should_notify(mentioned_id, 'mentions') then
      insert into public.notifications (user_id, type, actor_id, post_id)
      values (mentioned_id, 'mention', new.author_id, new.id);
    end if;
  end loop;
  return new;
end;
$$;

create trigger on_post_insert_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_mentions_in_post();

create or replace function public.notify_mentions_in_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  mentioned_id uuid;
begin
  for mentioned_id in select * from public.extract_mentioned_user_ids(new.body) loop
    if mentioned_id <> new.author_id and public.should_notify(mentioned_id, 'mentions') then
      insert into public.notifications (user_id, type, actor_id, post_id)
      values (mentioned_id, 'mention', new.author_id, new.post_id);
    end if;
  end loop;
  return new;
end;
$$;

create trigger on_comment_insert_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_mentions_in_comment();
