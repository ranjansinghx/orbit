# Orbit

Two feeds, one identity. **Home** is a full-screen, swipeable video/photo feed
ranked by engagement ("For You"). **Text** is a chronological, Twitter-style feed
of text posts from people you follow ("Following"). Same users, same follow graph,
same hashtags and comments underneath both.

This is now wired to a real **Supabase** backend: Postgres + Auth (email/password
+ Google OAuth) + Realtime + Storage.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project. Grab the URL and anon
key from **Settings → API**.

### 2. Run the schema

Open the **SQL Editor** in your Supabase dashboard and run every file in
`supabase/migrations/` **in order** (the numbering matters — a couple of
them split a change across two files because Postgres won't let a new enum
value be used in the same transaction that created it):

```
0001_init.sql
0002_features.sql
0003_watch_time.sql
0004_preferences_and_reports.sql
0005_mention_enum.sql
0006_mentions.sql
0007_repost_enum.sql
0008_reposts.sql
0009_drafts.sql
0010_push_subscriptions.sql
0011_admin_and_onboarding.sql
```

Paste each one in, run it, then move to the next. (If you prefer the CLI:
`supabase link` then `supabase db push` runs them all in order automatically.)

### 3. Enable Google OAuth (optional but in the spec)

In **Authentication → Providers → Google**, flip it on and add your Google OAuth
client ID/secret (from Google Cloud Console → Credentials). Set the authorized
redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is only needed for push notifications — see
`supabase/functions/send-push/README.md`; everything else works without it.

### 5. Run it

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — you'll land on `/login`. Sign up with email or
Google; a profile row is created automatically (see the `handle_new_user`
trigger in the migration). The feed starts empty since there's no seed data —
post something from the composer to see it show up.

```bash
npm run build && npm start   # production build
```

## What's new: mute, threaded replies, quote-repost, pin, edited indicator, private accounts, group DMs

Seven additions on top of the base app, all in `supabase/migrations/0012` through
`0017` — run them in order, after `0011_admin_and_onboarding.sql`:

- **Mute** (`0012_mutes.sql`) — silent and one-directional, unlike a block: a
  muted account keeps following/being followed and is never notified; you just
  stop seeing their posts and reposts in your own feeds. Available from the
  `···` menu on anyone else's post.
- **Threaded replies + comment likes** (`0013_comment_threads.sql`) — comments
  can now reply to a comment, not just to the post, and each comment can be
  liked independently. Top-level comments load eagerly; a thread's replies load
  on demand when you tap "View N replies".
- **Pinned post, "edited" indicator, quote-repost** (`0014_pin_edit_quote.sql`)
  — pin one of your own posts to the top of your profile; editing a caption now
  stamps `edited_at` and shows "· edited" next to the timestamp; reposting can
  optionally carry a comment of its own (the `···` menu → "Quote repost" on
  someone else's post).
- **Private accounts + follow requests** (`0015_follow_request_enum.sql` +
  `0016_private_accounts.sql`) — a private account's posts are hidden from
  everyone except the author, their accepted followers, and admins (reviewing
  reports), enforced at the RLS layer so every read path is covered
  automatically. Following a private account creates a pending request instead
  of following outright; manage incoming requests from Settings → Requests.
- **Group DMs** (`0017_group_dms.sql`) — the "new group" icon on the Messages
  page lets you start a conversation with 3+ people. 1:1 conversations are
  completely unchanged; groups are a second shape of the same `conversations`
  table, with membership tracked in a new `conversation_participants` table.

## What's new (round 2): mentions/hashtags autocomplete, audience & reply controls, polls, insights, collections

Three more migrations, `0018` through `0020` — run them in order after `0017_group_dms.sql`:

- **@mention / #hashtag autocomplete** — no migration needed, this is composer-only:
  typing `@` or `#` in the post composer now shows a live dropdown of matching
  people or hashtags (`components/MentionHashtagTextarea.tsx`).
- **Per-post audience + reply permissions** (`0018_audience_and_replies.sql`) —
  each post can be set to Everyone / Followers / Close friends independently
  of the account-level privacy setting, and replies can be limited to
  Everyone / Followers / people mentioned in the post. Both are chosen at
  posting time in the composer, and can be changed afterward from the `···`
  menu on your own post. Close friends is a fully private list (Settings →
  Close friends) — nobody can see who's on it.
- **Polls** (`0019_polls.sql`) — attach a 2–4 option poll to a text post with
  an optional voting window; results show live via realtime, revealed once
  you vote or the poll closes.
- **Post insights** (`components/PostInsightsModal.tsx`, no migration — it's
  a private view over counters the app already tracked) — "View insights"
  from the `···` menu on your own post shows engagement rate and a full
  breakdown, visible only to you.
- **Saved-post collections** (`0020_collections.sql`) — organize bookmarks
  into named folders from the Saved page or the "Move to collection" option
  in the `···` menu.

## What's real now



- **Auth**: real Supabase Auth. Email/password sign-up + sign-in, Google OAuth,
  session cookies refreshed by `middleware.ts`, protected routes (anything
  outside `/login` and `/auth/callback` redirects to login if signed out).
- **Data**: every table lives in Postgres with row-level security — people can
  only edit their own posts/comments/profile, only read their own DMs and
  notifications, etc. See `supabase/migrations/0001_init.sql` for the full
  policy set.
- **Ranking**: `get_for_you_feed()` is a Postgres function implementing the
  weighted score from the spec, run server-side with proper cursor pagination
  (ordered by `(score, id)`, so pages don't shift as new engagement comes in
  between requests). `lib/supabase/rank.ts` has a client-side version of the
  same formula for small already-fetched sets (the hashtag page's media tab).
- **Media upload**: `lib/supabase/upload.ts` uploads straight to Supabase
  Storage via a signed upload URL — the file never touches a Next.js API route,
  so large video files don't hit serverless payload/timeout limits.
- **Realtime**: messages, notifications, comments, and likes are all added to
  the `supabase_realtime` publication. The chat thread, notifications page, and
  comment sheet all subscribe to `postgres_changes` and update live. The typing
  indicator uses Realtime **Presence** (a per-conversation channel) rather than
  writing rows to the database for every keystroke.
- **Notifications**: fan out automatically via triggers — liking a post,
  commenting, following, and posting (to your followers) all insert
  notification rows server-side, so the client never has to remember to do it.
- **@mentions**: `@username` in captions/comments links to their profile and
  triggers a real notification, enforced server-side.
- **Reposts**: a "share to your Following feed" action, distinct from the
  copy-link Share button. The Following feed is server-ranked by a single
  Postgres function (`get_following_feed`) that merges original posts and
  reposts from people you follow into one cursor-paginated timeline.
- **Who liked a post**: tap any like count to see the list.
- **Draft posts**: save an in-progress post (including already-uploaded
  media) and resume it later from the composer's Drafts view.
- **PWA support**: installable on a phone or desktop like a native app
  (`app/manifest.ts` + `public/sw.js`), with generated app icons.
- **Light/dark mode**: a real toggle in Settings, backed by CSS custom
  properties (not just a handful of `dark:` classes) so every existing
  Tailwind color utility (`bg-ink`, `text-paper`, etc.) and every icon
  automatically repaints for the current theme with no per-component work.
- **Push notifications**: the app-side half (subscribing, a service worker
  push handler) is wired up. Actually *sending* a push requires a small
  Supabase Edge Function + a Database Webhook + VAPID keys — see
  `supabase/functions/send-push/README.md` for the full setup. This is the
  one piece I couldn't test end-to-end myself (no way to deploy an Edge
  Function or receive a real push from this environment) — the setup guide
  says exactly what to check if it doesn't fire.
- **Forgot password**: full flow — request link on `/login`, land on
  `/auth/reset-password` from the emailed link, set a new password.
- **Delete account**: a server-side route (`app/api/account/delete`) using
  the service role key to actually delete the auth user and their uploaded
  media — everything else cascades via the FK constraints already in the
  schema. Requires typing "DELETE" to confirm in Settings.
- **Reports are reviewable**: an `is_admin` flag on profiles, enforced via
  RLS (not just hidden in the UI), gates `/admin/reports` — a list of
  filed reports with reason, reporter, a link to the target, and
  reviewed/dismissed/reopen actions.
- **Open Graph tags on shared posts**: the post detail route generates real
  `<meta>` tags per post (title, caption excerpt, and the photo itself as
  the preview image for photo posts) so pasting a post link elsewhere shows
  an actual preview instead of a bare URL.
- **New-user onboarding**: a two-step modal shown once, right after your
  first sign-in — explains the Home/Text feed split, then suggests a few
  accounts to follow so the Following feed isn't empty on day one. Existing
  accounts were backfilled to skip it.

## Account & admin setup

- **Data export**: Settings → Profile → "Download your data" hits
  `app/api/account/export`, no extra setup needed.
- **Bot protection (Cloudflare Turnstile)**: optional. Get a site key from
  the [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
  (free — you don't need Cloudflare Pages/Workers, just the Turnstile
  product), set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, then in **Supabase →
  Authentication → Settings**, enable "Captcha protection" and paste the
  matching Turnstile *secret* key there. Without this env var set, the
  widget just doesn't render and auth works exactly as before — it's fully
  optional. **Important:** if you enable captcha protection in Supabase's
  dashboard, it applies to every password-based auth call project-wide
  (signup, signin, and password reset) — the login page already sends the
  token on all three, so don't enable it there without deploying this code
  first, or those flows will start failing.
- **Analytics**: uses `@vercel/analytics`. Deploying to Vercel is enough for
  the package to work, but you need to turn Analytics on for the project in
  the Vercel dashboard (Project → Analytics tab) — it's a free tier, just
  not on by default.
- **Legal pages** (`/legal/terms`, `/legal/privacy`): scaffolding only, with
  a visible on-page disclaimer. Read that disclaimer — this is not real
  legal coverage, have an actual lawyer review before you rely on it.


- **Making yourself an admin** (needed to review reports at `/admin/reports`):
  run this once in the SQL editor after signing up:
  ```sql
  update public.profiles set is_admin = true where username = 'your_username';
  ```
- **Account deletion** (`app/api/account/delete`) needs `SUPABASE_SERVICE_ROLE_KEY`
  set as a server-only environment variable — see `.env.example`. Without it,
  the "Delete account" button in Settings will fail with a 500.
- **Forgot password** works out of the box once Supabase Auth's email
  templates are configured (they are by default on a new project) — no
  extra setup beyond the migrations.

## What's still a stub

- There's no seed/demo data anymore — the app now reflects exactly what's in
  your Supabase project. If you want a populated demo, insert a few `auth.users`
  via the Supabase dashboard (or Admin API) and some rows into `posts` for them.
- Push notifications need the separate Edge Function + webhook setup in
  `supabase/functions/send-push/README.md` — the in-app half works without
  it, but nothing gets sent until that's deployed.

## Architecture

```
app/
  page.tsx                    Home — For You (video/photo, full-screen snap feed)
  text/page.tsx                Following — text feed, chronological
  messages/page.tsx            Conversation list
  messages/[id]/page.tsx       Chat thread (realtime + presence typing indicator)
  notifications/page.tsx       Realtime notifications
  search/page.tsx              Users + hashtags (hashtag_counts view)
  profile/[username]/page.tsx  Includes Settings (gear icon), media grid + text tabs
  hashtag/[tag]/page.tsx       Media tab (ranked) + text tab (chronological)
  post/[id]/page.tsx           Full post + inline comments
  login/page.tsx               Supabase Auth (email/password + Google)
  auth/callback/route.ts       OAuth code exchange

lib/supabase/
  client.ts / server.ts        Browser + server Supabase clients (@supabase/ssr)
  database.types.ts             Hand-written types matching the SQL schema
  hooks.ts                      All data-fetching hooks (SWR + realtime subscriptions)
  actions.ts                    All mutations (likes, follows, comments, posts, messages...)
  upload.ts                     Signed-URL direct-to-storage upload
  rank.ts                       Client-side ranking formula (mirrors the SQL function)
  useAuth.ts                    Auth/session/profile hooks

middleware.ts                   Session refresh + route protection

supabase/migrations/0001_init.sql   Full schema: tables, RLS, triggers, ranking
                                     function, realtime publication, storage bucket
```

### Ranking

```sql
score = likes*1 + comments*2 + shares*3 + watch_time_ratio*5*100
        - age_in_hours*0.12
        (× 1.15 if the viewer follows the author — a boost, not a filter)
```

Implemented once in SQL (`get_for_you_feed`) for the real paginated feed, and
mirrored in `lib/supabase/rank.ts` for the small, already-fetched hashtag view.

### Data model

Matches the suggested schema in the brief: `profiles`, `follows`, `posts`,
`hashtags`/`post_hashtags`, `comments`, `likes`, `conversations`, `messages`,
`notifications`. Full definitions with types and constraints are in the
migration file.

## Deploying to Cloudflare Workers

Cloudflare's own recommended path for Next.js today is **Workers via the
OpenNext adapter** (`@opennextjs/cloudflare`) — not Cloudflare Pages, whose
Next.js support only covers the limited Edge runtime and can't run this app's
middleware-based auth. This repo is already configured for it
(`wrangler.jsonc`, `open-next.config.ts`).

### One-time setup

```bash
npx wrangler login
```

Set your Supabase env vars as Cloudflare secrets (these are read at runtime,
separately from the `NEXT_PUBLIC_*` build-time values baked in during `next build`):

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Since these are `NEXT_PUBLIC_*` vars, they also need to be present at **build**
time so Next.js can inline them into the client bundle — easiest way is to
export them in your shell before building, or set them as **Build variables**
if you connect this repo through Cloudflare's dashboard CI instead of deploying
from your machine.

### Local preview against the real Workers runtime

```bash
cp .dev.vars.example .dev.vars   # fill in your real Supabase values
npm run cf:preview
```

### Deploy

```bash
npm run cf:deploy
```

This runs `next build`, transforms the output with OpenNext, and pushes it to
Cloudflare. You'll get a `*.workers.dev` URL (or your custom domain, if you've
attached one to this Worker in the Cloudflare dashboard).

If you already have the `orbit-nep` Pages project from before, you can leave
it as-is or delete it — the Workers deployment is a separate thing and won't
conflict with it.



Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Realtime, Storage) · SWR for client data fetching/caching · `next/font`
(Fraunces, Inter, JetBrains Mono).
