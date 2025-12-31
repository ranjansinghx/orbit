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

Open the **SQL Editor** in your Supabase dashboard, paste in the contents of
`supabase/migrations/0001_init.sql`, and run it. This creates every table, RLS
policy, trigger, the ranking function, and the `media` storage bucket in one
shot. (If you prefer the CLI: `supabase link` then `supabase db push`.)

### 3. Enable Google OAuth (optional but in the spec)

In **Authentication → Providers → Google**, flip it on and add your Google OAuth
client ID/secret (from Google Cloud Console → Credentials). Set the authorized
redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

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

## What's still a stub

- **Rate limiting**: the spec asks for basic rate limiting on post creation and
  likes. That's easiest to add at the edge — either Supabase Edge Functions in
  front of writes, or a small Upstash Redis counter checked in `actions.ts`
  before each mutation. Not wired up yet.
- **Notification preferences**: the toggles in Settings are UI-only. Persist
  them to a `notification_preferences` table and check them in the trigger
  functions before inserting a notification row.
- **Password change form**: the Settings modal has a placeholder tab; wire it to
  `supabase.auth.updateUser({ password })`.
- There's no seed/demo data anymore — the app now reflects exactly what's in
  your Supabase project. If you want a populated demo, insert a few `auth.users`
  via the Supabase dashboard (or Admin API) and some rows into `posts` for them.

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
