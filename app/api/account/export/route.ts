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
    drafts,
    savedPosts,
    reposts,
    blocked,
    notificationPreferences,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single(),
    supabase.from("posts").select("*").eq("author_id", uid).order("created_at", { ascending: false }),
    supabase.from("comments").select("*").eq("author_id", uid).order("created_at", { ascending: false }),
    supabase.from("likes").select("post_id, created_at").eq("user_id", uid),
    supabase.from("follows").select("followee_id, created_at").eq("follower_id", uid),
    supabase.from("follows").select("follower_id, created_at").eq("followee_id", uid),
    supabase.from("conversations").select("*").or(`user_a_id.eq.${uid},user_b_id.eq.${uid}`),
    supabase.from("drafts").select("*").eq("user_id", uid),
    supabase.from("saved_posts").select("post_id, created_at").eq("user_id", uid),
    supabase.from("reposts").select("post_id, created_at").eq("user_id", uid),
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", uid),
    supabase.from("notification_preferences").select("*").eq("user_id", uid).maybeSingle(),
  ]);

  // Messages across every conversation the user is part of.
  const conversationIds = (conversations.data ?? []).map((c) => c.id);
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
