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
  patch: Partial<{ display_name: string; bio: string; avatar_url: string; username: string }>
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
