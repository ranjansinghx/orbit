-- =========================================================================
-- Orbit — admin flag + onboarding state
-- =========================================================================

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists onboarded boolean not null default false;

-- Existing accounts (created before onboarding existed) shouldn't be forced
-- through it retroactively.
update public.profiles set onboarded = true where onboarded = false;

-- To make your own account an admin so you can review reports, run this
-- once in the SQL editor (replace with your actual user id from the
-- profiles table):
--   update public.profiles set is_admin = true where username = 'your_username';

create policy "admins can read all reports"
  on public.reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create policy "admins can update report status"
  on public.reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
