import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const uid = user.id;

  const [
    profile,
    posts,
    comments,
    likes,
    following,
    followers,
    conversations,
    groupMemberships,
    drafts,
    savedPosts,
    reposts,
    blocked,
    muted,
    notificationPreferences,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single(),
    supabase.from("posts").select("*").eq("author_id", uid).order("created_at", { ascending: false }),
    supabase.from("comments").select("*").eq("author_id", uid).order("created_at", { ascending: false }),
    supabase.from("likes").select("post_id, created_at").eq("user_id", uid),
    supabase.from("follows").select("followee_id, created_at, status").eq("follower_id", uid),
    supabase.from("follows").select("follower_id, created_at, status").eq("followee_id", uid),
    supabase.from("conversations").select("*").or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`),
    supabase.from("conversation_participants").select("conversation_id").eq("user_id", uid),
    supabase.from("drafts").select("*").eq("user_id", uid),
    supabase.from("saved_posts").select("post_id, created_at").eq("user_id", uid),
    supabase.from("reposts").select("post_id, created_at, quote").eq("user_id", uid),
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", uid),
    supabase.from("mutes").select("muted_id, created_at").eq("user_id", uid),
    supabase.from("notification_preferences").select("*").eq("user_id", uid).maybeSingle(),
  ]);

  // Messages across every conversation the user is part of — 1:1s found
  // directly on `conversations`, groups found via conversation_participants
  // (a group member other than the creator never appears in user_a_id/
  // user_b_id, only in the participants table).
  const conversationIds = Array.from(
    new Set([
      ...(conversations.data ?? []).map((c) => c.id),
      ...(groupMemberships.data ?? []).map((g) => g.conversation_id),
    ])
  );
  const messages = conversationIds.length
    ? await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    posts: posts.data ?? [],
    comments: comments.data ?? [],
    likes: likes.data ?? [],
    following: following.data ?? [],
    followers: followers.data ?? [],
    conversations: conversations.data ?? [],
    messages: messages.data ?? [],
    drafts: drafts.data ?? [],
    saved_posts: savedPosts.data ?? [],
    reposts: reposts.data ?? [],
    blocked_accounts: blocked.data ?? [],
    muted_accounts: muted.data ?? [],
    notification_preferences: notificationPreferences.data,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="orbit-data-${uid}.json"`,
    },
  });
}
