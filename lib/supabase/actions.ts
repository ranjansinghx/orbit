import { createClient } from "@/lib/supabase/client";
import { PostType } from "@/lib/supabase/database.types";

export async function toggleLike(postId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_like", { p_post_id: postId });
  if (error) throw error;
  return data as boolean; // true = now liked
}

export async function toggleFollow(targetId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_follow", { p_target_id: targetId });
  if (error) throw error;
  return data as boolean; // true = now following
}

export async function addComment(postId: string, authorId: string, body: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createPost(input: {
  authorId: string;
  type: PostType;
  caption: string;
  mediaUrls: string[];
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: input.authorId,
      type: input.type,
      caption: input.caption,
      media_urls: input.mediaUrls,
      watch_time_ratio: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function registerView(postId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_view_count", { p_post_id: postId });
  if (error) throw error;
}

export async function updatePostCaption(postId: string, caption: string) {
  const supabase = createClient();
  const { error } = await supabase.from("posts").update({ caption }).eq("id", postId);
  if (error) throw error;
}

export async function recordWatchTime(postId: string, ratio: number) {
  const supabase = createClient();
  const clamped = Math.max(0, Math.min(1, ratio));
  const { error } = await supabase.rpc("record_watch_time", { p_post_id: postId, p_ratio: clamped });
  if (error) throw error;
}

export async function registerShare(postId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_share_count", { p_post_id: postId });
  if (error) throw error;
}

export async function startConversation(otherUserId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other_id: otherUserId,
  });
  if (error) throw error;
  return data as string; // conversation id
}

export async function sendMessage(conversationId: string, senderId: string, body: string, mediaUrl?: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: body || null,
      media_url: mediaUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead(conversationId: string, myUserId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myUserId)
    .is("read_at", null);
  if (error) throw error;
}

export async function markNotificationsRead(myUserId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", myUserId)
    .is("read_at", null);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ display_name: string; bio: string; avatar_url: string; username: string; onboarded: boolean }>
) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export async function deleteAccount() {
  const res = await fetch("/api/account/delete", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't delete account");
  }
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export async function changePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<{ likes: boolean; comments: boolean; follows: boolean; new_post: boolean; mentions: boolean }>
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function updateReportStatus(reportId: string, status: "open" | "reviewed" | "dismissed") {
  const supabase = createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) throw error;
}

export async function submitReport(input: {
  reporterId: string;
  targetType: "post" | "user";
  targetId: string;
  reason: string;
  details?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function toggleBlock(targetId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_block", { p_target_id: targetId });
  if (error) throw error;
  return data as boolean; // true = now blocked
}

export async function toggleSave(postId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_save", { p_post_id: postId });
  if (error) throw error;
  return data as boolean; // true = now saved
}

export async function toggleRepost(postId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("toggle_repost", { p_post_id: postId });
  if (error) throw error;
  return data as boolean; // true = now reposted
}

export async function saveDraft(input: {
  id?: string;
  userId: string;
  type: PostType;
  caption: string;
  mediaUrls: string[];
}) {
  const supabase = createClient();
  if (input.id) {
    const { error } = await supabase
      .from("drafts")
      .update({
        type: input.type,
        caption: input.caption,
        media_urls: input.mediaUrls,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (error) throw error;
    return input.id;
  }
  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: input.userId,
      type: input.type,
      caption: input.caption,
      media_urls: input.mediaUrls,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteDraft(draftId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("drafts").delete().eq("id", draftId);
  if (error) throw error;
}

export async function savePushSubscription(userId: string, sub: PushSubscription) {
  const supabase = createClient();
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string) {
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
