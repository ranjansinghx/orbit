# Push notifications setup

Real push notifications (the kind that arrive even with Orbit closed) need
three pieces working together: a VAPID key pair, an Edge Function that sends
the push, and a Database Webhook that triggers it whenever a notification is
created.

## 1. VAPID keys

A key pair has already been generated for you:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BCzPa6bBiy78pSez1PvAhzObjfGu1E-njMVMkOvq5dwLYd2GiRtVCmr3pbouCEqh1bDNBo5SDIE0dayEXNRvQ0k
VAPID_PRIVATE_KEY=OiMOhUPiRYW0NMXTitFg653bnwfSdELO0FGFX9doBZQ
```

The **public** key goes in your app's environment variables (it's meant to
be public — it's sent to the browser). Add it to `.env.local` and to your
Vercel project's Environment Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BCzPa6bBiy78pSez1PvAhzObjfGu1E-njMVMkOvq5dwLYd2GiRtVCmr3pbouCEqh1bDNBo5SDIE0dayEXNRvQ0k
```

The **private** key must never appear in client code or the repo. It only
goes into the Edge Function's secrets (next step).

If you'd rather generate your own pair instead of using the one above:

```bash
npx web-push generate-vapid-keys
```

## 2. Deploy the Edge Function

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase login
supabase link --project-ref eaxzpxdrqsntdbkfupwf
supabase functions deploy send-push
```

Then set its secrets (these are separate from your Next.js env vars — Edge
Functions have their own secret store):

```bash
supabase secrets set VAPID_PUBLIC_KEY=BCzPa6bBiy78pSez1PvAhzObjfGu1E-njMVMkOvq5dwLYd2GiRtVCmr3pbouCEqh1bDNBo5SDIE0dayEXNRvQ0k
supabase secrets set VAPID_PRIVATE_KEY=OiMOhUPiRYW0NMXTitFg653bnwfSdELO0FGFX9doBZQ
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
supabase secrets set SUPABASE_URL=https://eaxzpxdrqsntdbkfupwf.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service_role key from Settings → API>
```

The service role key is the one you should **never** put in `.env.local` —
it bypasses Row Level Security. It's safe here specifically because Edge
Function secrets are only readable by the function itself, never sent to a
browser.

## 3. Wire up the Database Webhook

In the Supabase dashboard: **Database → Webhooks → Create a new hook**

- Table: `notifications`
- Events: `Insert`
- Type: `Supabase Edge Function`
- Edge Function: `send-push`

This makes every new row in `notifications` — which, per the triggers in
`0001_init.sql` through `0008_reposts.sql`, already fires for likes,
comments, follows, new posts, mentions, and reposts — automatically call the
function with the new row as its payload.

## 4. Test it

1. Deploy the app with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set
2. Open Orbit on a device, go to Settings → Notifications, turn on "Push
   notifications" (you'll get a browser permission prompt)
3. From a second account, like or comment on that user's post
4. A system push notification should appear within a few seconds, even if
   the tab is closed (though not if the browser itself is fully quit on some
   platforms — that's a platform limitation, not something Orbit controls)

## Why I can't fully verify this one myself

Everything up through step 2 I tested directly (the app code builds and
type-checks). Steps 3 onward require an actual Supabase project, real VAPID
secrets, a live webhook, and a real browser push subscription — none of
which exist in the sandbox I build in. If step 4 doesn't work, the most
likely culprits, roughly in order of likelihood:

- The webhook isn't configured, or points at the wrong function
- `SUPABASE_SERVICE_ROLE_KEY` wasn't set as an Edge Function secret (check
  `supabase functions logs send-push` for an auth error)
- The browser blocked the permission prompt, or push isn't supported in
  that specific browser (Safari's support is newer and pickier than
  Chrome's)
