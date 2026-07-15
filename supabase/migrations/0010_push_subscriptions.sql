-- =========================================================================
-- Orbit — web push subscriptions
-- Stores browser push subscriptions so the send-push Edge Function (see
-- supabase/functions/send-push) knows where to deliver each notification.
-- =========================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "users can read their own push subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "users can add their own push subscriptions"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "users can remove their own push subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- Fires a Database Webhook (configure in Supabase dashboard → Database →
-- Webhooks) pointed at the send-push Edge Function whenever a notification
-- is created, so pushes go out in near-real-time without polling.
-- No SQL needed here beyond the table above — the webhook is configured
-- via the dashboard UI (or `supabase db webhooks` if scripting it), since
-- webhook config isn't part of the SQL schema. See README for the exact
-- steps.
