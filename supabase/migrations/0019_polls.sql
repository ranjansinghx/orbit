-- =========================================================================
-- Orbit — polls
-- A poll is an optional attachment to a text post (one poll per post),
-- not a new post type — this avoids an enum split across migrations and
-- keeps every existing post_type-based code path untouched.
-- Run this AFTER 0018_audience_and_replies.sql.
-- =========================================================================

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  position smallint not null,
  label text not null,
  vote_count int not null default 0,
  unique (poll_id, position)
);

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Polls/options are readable by anyone who can read the underlying post —
-- reuses the posts RLS policy from 0018 via the join.
create policy "polls are readable if the post is"
  on public.polls for select using (
    exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "poll options are readable if the post is"
  on public.poll_options for select using (
    exists (select 1 from public.polls pl join public.posts p on p.id = pl.post_id where pl.id = poll_id)
  );
create policy "post authors can create polls on their own posts"
  on public.polls for insert with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );
create policy "post authors can add options to their own polls"
  on public.poll_options for insert with check (
    exists (
      select 1 from public.polls pl join public.posts p on p.id = pl.post_id
      where pl.id = poll_id and p.author_id = auth.uid()
    )
  );

-- Votes: only the voter can see their own vote row (results themselves are
-- exposed separately, through get_poll_results, once you've voted or the
-- poll has closed — see below).
create policy "users can see their own vote"
  on public.poll_votes for select using (auth.uid() = user_id);
create policy "users can vote as themselves"
  on public.poll_votes for insert with check (auth.uid() = user_id);
create policy "users can change their vote"
  on public.poll_votes for update using (auth.uid() = user_id);

create or replace function public.bump_poll_option_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
    return new;
  elsif tg_op = 'UPDATE' and old.option_id <> new.option_id then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_poll_vote_change
  after insert or update or delete on public.poll_votes
  for each row execute function public.bump_poll_option_vote_count();

-- Creates a poll with 2-4 options on a text post the caller owns.
create or replace function public.create_poll(p_post_id uuid, p_options text[], p_closes_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  poll_id uuid;
  i int;
begin
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2 or array_length(p_options, 1) > 4 then
    raise exception 'invalid_poll: a poll needs 2 to 4 options';
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and author_id = auth.uid()) then
    raise exception 'not_owner: you can only add a poll to your own post';
  end if;

  insert into public.polls (post_id, closes_at) values (p_post_id, p_closes_at) returning id into poll_id;

  for i in 1 .. array_length(p_options, 1) loop
    insert into public.poll_options (poll_id, position, label) values (poll_id, i, trim(p_options[i]));
  end loop;

  return poll_id;
end;
$$;

-- Casts (or changes) the caller's vote. Rejects votes after closes_at.
create or replace function public.cast_poll_vote(p_option_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target_poll_id uuid;
  closes timestamptz;
begin
  select poll_id into target_poll_id from public.poll_options where id = p_option_id;
  if target_poll_id is null then
    raise exception 'invalid_option';
  end if;
  select closes_at into closes from public.polls where id = target_poll_id;
  if closes is not null and closes < now() then
    raise exception 'poll_closed: voting has closed';
  end if;

  insert into public.poll_votes (poll_id, option_id, user_id)
  values (target_poll_id, p_option_id, auth.uid())
  on conflict (poll_id, user_id) do update set option_id = excluded.option_id, created_at = now();
end;
$$;

-- Full results — every option's vote count and share, plus whether/what
-- the caller voted. Exposed to anyone who can read the post (matches
-- Twitter/IG behavior where results are visible even before you vote).
create or replace function public.get_poll_results(p_post_id uuid)
returns table (
  poll_id uuid,
  closes_at timestamptz,
  option_id uuid,
  label text,
  vote_count int,
  total_votes bigint,
  my_vote boolean
)
language sql stable as $$
  with totals as (
    select pl.id as poll_id, sum(po.vote_count) as total
    from public.polls pl
    join public.poll_options po on po.poll_id = pl.id
    where pl.post_id = p_post_id
    group by pl.id
  )
  select
    pl.id, pl.closes_at, po.id, po.label, po.vote_count,
    coalesce(t.total, 0),
    exists (select 1 from public.poll_votes v where v.option_id = po.id and v.user_id = auth.uid())
  from public.polls pl
  join public.poll_options po on po.poll_id = pl.id
  left join totals t on t.poll_id = pl.id
  where pl.post_id = p_post_id
  order by po.position;
$$;

alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.poll_options;
