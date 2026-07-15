-- =========================================================================
-- Orbit — draft posts
-- =========================================================================

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.post_type not null,
  caption text not null default '',
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drafts_user_idx on public.drafts (user_id, updated_at desc);

alter table public.drafts enable row level security;

create policy "users can read their own drafts"
  on public.drafts for select using (auth.uid() = user_id);
create policy "users can create their own drafts"
  on public.drafts for insert with check (auth.uid() = user_id);
create policy "users can update their own drafts"
  on public.drafts for update using (auth.uid() = user_id);
create policy "users can delete their own drafts"
  on public.drafts for delete using (auth.uid() = user_id);
