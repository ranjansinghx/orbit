-- =========================================================================
-- Orbit — saved-post collections (folders for bookmarks)
-- Run this AFTER 0019_polls.sql.
-- =========================================================================

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.saved_posts add column if not exists collection_id uuid references public.collections(id) on delete set null;

alter table public.collections enable row level security;

create policy "users can view their own collections"
  on public.collections for select using (auth.uid() = user_id);
create policy "users can create their own collections"
  on public.collections for insert with check (auth.uid() = user_id);
create policy "users can rename their own collections"
  on public.collections for update using (auth.uid() = user_id);
create policy "users can delete their own collections"
  on public.collections for delete using (auth.uid() = user_id);

create or replace function public.create_collection(p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  insert into public.collections (user_id, name) values (auth.uid(), trim(p_name))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.move_saved_post(p_post_id uuid, p_collection_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_collection_id is not null and not exists (
    select 1 from public.collections where id = p_collection_id and user_id = auth.uid()
  ) then
    raise exception 'not_owner: you can only file into your own collections';
  end if;
  update public.saved_posts set collection_id = p_collection_id
    where user_id = auth.uid() and post_id = p_post_id;
end;
$$;
