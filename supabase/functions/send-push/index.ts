// Orbit — send-push Edge Function
//
// Triggered by a Supabase Database Webhook on INSERT into public.notifications
// (configure the webhook in the dashboard — see supabase/functions/send-push/README.md).
// Looks up the notified user's push subscriptions and sends a real web push
// via VAPID, so they get notified even with the app closed.

// @ts-nocheck — this file runs on Deno (Supabase Edge Runtime), not Node;
// the imports below use Deno's npm: specifier support and won't resolve in
// a normal TypeScript/Next.js editor context, which is expected.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  // Service role key — required to read push_subscriptions across users
  // (RLS on that table only allows reading your own rows otherwise).
  // Set this as an Edge Function secret; never expose it client-side.
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const NOTIFICATION_COPY: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  new_post: "shared a new post",
  mention: "mentioned you",
  repost: "reposted your post",
};

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record) return new Response("missing record", { status: 400 });

    const { user_id, type, actor_id, post_id } = record;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (!subs || subs.length === 0) {
      return new Response("no subscriptions for this user", { status: 200 });
    }

    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", actor_id)
      .single();

    const body = `${actor?.display_name ?? "Someone"} ${NOTIFICATION_COPY[type] ?? "sent you a notification"}`;
    const url = type === "follow" ? "/notifications" : post_id ? `/post/${post_id}` : "/notifications";
    const messagePayload = JSON.stringify({ title: "Orbit", body, url });

    await Promise.all(
      subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            messagePayload
          );
        } catch (err: any) {
          // 404/410 means the browser subscription is dead (uninstalled,
          // permissions revoked, etc.) — clean it up rather than retry.
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            console.error("push send failed:", err);
          }
        }
      })
    );

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
