-- =========================================================================
-- Orbit — group DMs
-- Run this AFTER 0016_private_accounts.sql.
--
-- Existing 1:1 conversations keep using user_a_id/user_b_id exactly as
-- before (nothing about that path changes). Groups are a second shape of
-- the same table: is_group = true, user_b_id left null, and membership
-- tracked in a new conversation_participants table instead. Every RLS
-- policy and helper that used to check "am I user_a_id or user_b_id" now
-- also checks "am I a participant", so both shapes are covered uniformly.
-- =========================================================================

alter table public.conversations drop constraint if exists conversations_check;
alter table public.conversations add column if not exists is_group boolean not null default false;
alter table public.conversations add column if not exists title text;
alter table public.conversations add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- user_b_id and the (user_a_id <> user_b_id) check only make sense for 1:1
-- conversations — relax both so a group row can leave user_b_id null.
alter table public.conversations alter column user_b_id drop not null;
alter table public.conversations add constraint conversations_one_on_one_check
  check (is_group or (user_b_id is not null and user_a_id <> user_b_id));

-- The old unique(user_a_id, user_b_id) constraint would also block a
-- second 1:1 conversation from ever existing, which is exactly what we
-- want for 1:1s but must not apply to groups (many groups can share a
-- creator). Replace it with a partial unique index scoped to 1:1s only.
alter table public.conversations drop constraint if exists conversations_user_a_id_user_b_id_key;
create unique index if not exists conversations_one_on_one_unique
  on public.conversations (least(user_a_id, user_b_id), greatest(user_a_id, user_b_id))
  where not is_group;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.user_a_id = p_user_id or c.user_b_id = p_user_id)
  ) or exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = p_user_id
  );
$$;

create policy "participants can view their group's participant list"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));
create policy "members can leave a group"
  on public.conversation_participants for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- conversations + messages RLS, extended to cover group membership
-- ---------------------------------------------------------------------
drop policy if exists "participants can read their conversations" on public.conversations;
drop policy if exists "users can start a conversation they're part of" on public.conversations;

create policy "participants can read their conversations"
  on public.conversations for select
  using (public.is_conversation_participant(id, auth.uid()));
create policy "users can start a conversation they're part of"
  on public.conversations for insert
  with check (auth.uid() = user_a_id or auth.uid() = created_by);
create policy "group creators can rename their group"
  on public.conversations for update
  using (is_group and auth.uid() = created_by);

drop policy if exists "participants can read messages" on public.messages;
drop policy if exists "participants can send messages" on public.messages;
drop policy if exists "recipients can mark messages read" on public.messages;

create policy "participants can read messages"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));
create policy "participants can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id and public.is_conversation_participant(conversation_id, auth.uid()));
create policy "participants can mark messages read"
  on public.messages for update
  using (public.is_conversation_participant(conversation_id, auth.uid()));

-- ---------------------------------------------------------------------
-- Creates a group conversation and seeds its participant list (including
-- the creator). Requires at least 2 other members so a "group" always has
-- 3+ people — for just one other person, use get_or_create_conversation.
-- ---------------------------------------------------------------------
create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conv_id uuid;
  member_id uuid;
begin
  if array_length(p_member_ids, 1) is null or array_length(p_member_ids, 1) < 2 then
    raise exception 'group_too_small: a group needs at least 2 other members';
  end if;

  insert into public.conversations (user_a_id, is_group, title, created_by)
  values (auth.uid(), true, nullif(trim(p_title), ''), auth.uid())
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, auth.uid());
  foreach member_id in array p_member_ids loop
    if member_id <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id)
        values (conv_id, member_id)
        on conflict do nothing;
    end if;
  end loop;

  return conv_id;
end;
$$;

create or replace function public.leave_group_conversation(p_conversation_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

-- Returns every conversation the caller is part of, 1:1 or group, with
-- enough denormalized info to render a conversation list without N+1
-- lookups: for 1:1s, the other participant's id; for groups, the title
-- (falling back to member display names, resolved client-side) and
-- member count.
create or replace function public.get_my_conversations()
returns table (
  id uuid,
  is_group boolean,
  title text,
  last_message_at timestamptz,
  other_user_id uuid,
  member_count int
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.is_group,
    c.title,
    c.last_message_at,
    case when not c.is_group then (case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end) else null end as other_user_id,
    case when c.is_group then (select count(*)::int from public.conversation_participants cp where cp.conversation_id = c.id) else 2 end as member_count
  from public.conversations c
  where public.is_conversation_participant(c.id, auth.uid())
  order by c.last_message_at desc;
$$;

alter publication supabase_realtime add table public.conversation_participants;
