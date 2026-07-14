"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/supabase/useAuth";
import { PostType } from "@/lib/supabase/database.types";

export interface FeedPost {
  id: string;
  author_id: string;
  type: PostType;
  media_urls: string[];
  caption: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  watch_time_ratio: number;
  liked_by_me: boolean;
  hashtags: string[];
}

const PAGE_SIZE = 10;

/** Attaches `liked_by_me` + `hashtags` to a raw row of posts for one viewer. */
async function hydratePosts(
  supabase: ReturnType<typeof createClient>,
  rows: any[],
  viewerId: string | null
): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [{ data: likedRows }, { data: tagRows }] = await Promise.all([
    viewerId
      ? supabase.from("likes").select("post_id").eq("user_id", viewerId).in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    supabase
      .from("post_hashtags")
      .select("post_id, hashtags(tag)")
      .in("post_id", ids),
  ]);

  const likedSet = new Set((likedRows ?? []).map((r) => r.post_id));
  const tagMap = new Map<string, string[]>();
  (tagRows ?? []).forEach((r: any) => {
    const tag = r.hashtags?.tag;
    if (!tag) return;
    const list = tagMap.get(r.post_id) ?? [];
    list.push(tag);
    tagMap.set(r.post_id, list);
  });

  return rows.map((r) => ({
    ...r,
    liked_by_me: likedSet.has(r.id),
    hashtags: tagMap.get(r.id) ?? [],
  }));
}

/** For You: server-ranked, cursor-paginated video/photo feed. */
export function useForYouFeed(viewerId: string | null | undefined) {
  const supabase = createClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<{ score: number; id: string } | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (viewerId === undefined || loading || done) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_for_you_feed", {
      p_viewer_id: viewerId ?? "00000000-0000-0000-0000-000000000000",
      p_cursor_score: cursor?.score ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: PAGE_SIZE,
    });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    if (!data || data.length === 0) {
      setDone(true);
      return;
    }
    const hydrated = await hydratePosts(supabase, data, viewerId ?? null);
    setPosts((prev) => [...prev, ...hydrated]);
    const last = data[data.length - 1];
    setCursor({ score: last.score, id: last.id });
    if (data.length < PAGE_SIZE) setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, cursor, done, loading]);

  useEffect(() => {
    if (viewerId !== undefined && posts.length === 0 && !done) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId]);

  const patchPost = useCallback((id: string, patch: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { posts, loadMore: load, hasMore: !done, loading, patchPost, removePost };
}

/** Following: chronological text-only feed from followed accounts. */
export function useFollowingFeed(viewerId: string | null | undefined) {
  const supabase = createClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewerId || loading || done) return;
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .eq("type", "text")
      .in(
        "author_id",
        (
          await supabase.from("follows").select("followee_id").eq("follower_id", viewerId)
        ).data?.map((f) => f.followee_id) ?? []
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    if (!data || data.length === 0) {
      setDone(true);
      return;
    }
    const hydrated = await hydratePosts(supabase, data, viewerId);
    setPosts((prev) => [...prev, ...hydrated]);
    setCursor(data[data.length - 1].created_at);
    if (data.length < PAGE_SIZE) setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, cursor, done, loading]);

  useEffect(() => {
    if (viewerId && posts.length === 0 && !done) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId]);

  const patchPost = useCallback((id: string, patch: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { posts, loadMore: load, hasMore: !done, loading, patchPost, removePost };
}

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  new_post: boolean;
  mentions: boolean;
}

export function useNotificationPreferences(userId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(userId ? ["notification-prefs", userId] : null, async () => {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId!)
      .maybeSingle();
    if (error) throw error;
    // Falls back to all-on if the row is somehow missing (shouldn't happen —
    // created automatically on signup — but keeps the UI sane either way).
    return (data ?? { user_id: userId, likes: true, comments: true, follows: true, new_post: true, mentions: true }) as {
      user_id: string;
    } & NotificationPreferences;
  });
  return { preferences: data, mutate };
}

export function useProfileById(id: string | undefined) {
  const supabase = createClient();
  const { data } = useSWR(id ? ["profile-by-id", id] : null, async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id!).single();
    if (error) throw error;
    return data as Profile;
  });
  return data;
}

export function useProfileByUsername(username: string | undefined) {
  const supabase = createClient();
  const { data, error, mutate } = useSWR(username ? ["profile-by-username", username] : null, async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("username", username!).single();
    if (error) throw error;
    return data as Profile;
  });
  return { profile: data, error, mutate };
}

export function useProfilesMap(ids: string[]) {
  const supabase = createClient();
  const key = ids.length ? ["profiles-map", [...new Set(ids)].sort().join(",")] : null;
  const { data } = useSWR(key, async () => {
    const { data, error } = await supabase.from("profiles").select("*").in("id", [...new Set(ids)]);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((p) => [p.id, p])) as Record<string, Profile>;
  });
  return data ?? {};
}

export function useFollowCounts(userId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(userId ? ["follow-counts", userId] : null, async () => {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId!),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!),
    ]);
    return { followers: followers ?? 0, following: following ?? 0 };
  });
  return { counts: data ?? { followers: 0, following: 0 }, mutate };
}

export function useIsFollowing(viewerId: string | null | undefined, targetId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(
    viewerId && targetId ? ["is-following", viewerId, targetId] : null,
    async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", viewerId!)
        .eq("followee_id", targetId!)
        .maybeSingle();
      return !!data;
    }
  );
  return { isFollowing: !!data, mutate };
}

export function useUserPosts(userId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(userId ? ["user-posts", userId] : null, async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("author_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (await hydratePosts(supabase, data ?? [], userId ?? null)) as FeedPost[];
  });
  return { posts: data ?? [], mutate };
}

export function usePost(postId: string | undefined, viewerId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(postId ? ["post", postId] : null, async () => {
    const { data, error } = await supabase.from("posts").select("*").eq("id", postId!).single();
    if (error) throw error;
    const [hydrated] = await hydratePosts(supabase, [data], viewerId ?? null);
    return hydrated;
  });
  return { post: data, mutate };
}

export function useComments(postId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(postId ? ["comments", postId] : null, async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => mutate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return { comments: data ?? [], mutate };
}

export function useHashtagPosts(tag: string) {
  const supabase = createClient();
  const { data } = useSWR(["hashtag-posts", tag], async () => {
    const { data: rows, error } = await supabase
      .from("post_hashtags")
      .select("posts(*)")
      .eq("hashtag_id", (await supabase.from("hashtags").select("id").eq("tag", tag).single()).data?.id ?? "");
    if (error) return [];
    const posts = (rows ?? []).map((r: any) => r.posts).filter(Boolean);
    return (await hydratePosts(supabase, posts, null)) as FeedPost[];
  });
  return { posts: data ?? [] };
}

export function useSearch(query: string) {
  const supabase = createClient();
  const { data } = useSWR(["search", query], async () => {
    const [{ data: hashtags }, { data: people }] = await Promise.all([
      query
        ? supabase.from("hashtag_counts").select("*").ilike("tag", `%${query}%`).limit(15)
        : supabase.from("hashtag_counts").select("*").limit(10),
      query
        ? supabase
            .from("profiles")
            .select("*")
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(15)
        : supabase.from("profiles").select("*").limit(8),
    ]);
    return { hashtags: hashtags ?? [], people: (people ?? []) as Profile[] };
  });
  return { hashtags: data?.hashtags ?? [], people: data?.people ?? [] };
}

/** People you don't already follow yet — used to fix the empty-Following-feed problem. */
export function useSuggestedFollows(viewerId: string | null | undefined, limit = 6) {
  const supabase = createClient();
  const blockedIds = useBlockedIds(viewerId);
  const { data, mutate } = useSWR(
    viewerId ? ["suggested-follows", viewerId, blockedIds.size] : null,
    async () => {
      const { data: following } = await supabase.from("follows").select("followee_id").eq("follower_id", viewerId!);
      const excludeIds = new Set([viewerId!, ...(following ?? []).map((f) => f.followee_id), ...blockedIds]);
      const { data: people, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit + excludeIds.size);
      if (error) throw error;
      return (people ?? []).filter((p) => !excludeIds.has(p.id)).slice(0, limit) as Profile[];
    }
  );
  return { people: data ?? [], mutate };
}

export function useConversations(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["conversations", myId] : null, async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a_id.eq.${myId},user_b_id.eq.${myId}`)
      .order("last_message_at", { ascending: false });
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`conversations-${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => mutate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return { conversations: data ?? [], mutate };
}

export function useMessages(conversationId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(conversationId ? ["messages", conversationId] : null, async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId!)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => mutate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return { messages: data ?? [], mutate };
}

export function useNotifications(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["notifications", myId] : null, async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", myId!)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`notifications-${myId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${myId}` },
        () => mutate()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return { notifications: data ?? [], mutate };
}

/** Unread badge counts for the nav — kept lightweight (head counts only). */
export function useUnreadCounts(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["unread-counts", myId] : null, async () => {
    const [{ count: notifs }, { data: convIds }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", myId!)
        .is("read_at", null),
      supabase.from("conversations").select("id").or(`user_a_id.eq.${myId},user_b_id.eq.${myId}`),
    ]);
    let unreadMessages = 0;
    if (convIds && convIds.length) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds.map((c) => c.id))
        .neq("sender_id", myId!)
        .is("read_at", null);
      unreadMessages = count ?? 0;
    }
    return { notifications: notifs ?? 0, messages: unreadMessages };
  });

  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`unread-${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => mutate())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => mutate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return data ?? { notifications: 0, messages: 0 };
}

// ---------------------------------------------------------------------
// Blocking + saved posts
// ---------------------------------------------------------------------

export function useIsBlocked(viewerId: string | null | undefined, targetId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(
    viewerId && targetId ? ["is-blocked", viewerId, targetId] : null,
    async () => {
      const { data } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocker_id", viewerId!)
        .eq("blocked_id", targetId!)
        .maybeSingle();
      return !!data;
    }
  );
  return { isBlocked: !!data, mutate };
}

/** All the ids the current user has blocked — used to filter feeds/search client-side. */
export function useBlockedIds(myId: string | null | undefined) {
  const supabase = createClient();
  const { data } = useSWR(myId ? ["blocked-ids", myId] : null, async () => {
    const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", myId!);
    return new Set((data ?? []).map((b) => b.blocked_id));
  });
  return data ?? new Set<string>();
}

export function useBlockedProfiles(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["blocked-profiles", myId] : null, async () => {
    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id, profiles!blocks_blocked_id_fkey(*)")
      .eq("blocker_id", myId!);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profiles as Profile).filter(Boolean);
  });
  return { blocked: data ?? [], mutate };
}

export function useIsSaved(myId: string | null | undefined, postId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId && postId ? ["is-saved", myId, postId] : null, async () => {
    const { data } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", myId!)
      .eq("post_id", postId!)
      .maybeSingle();
    return !!data;
  });
  return { isSaved: !!data, mutate };
}

export function useSavedFeed(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["saved-feed", myId] : null, async () => {
    const { data, error } = await supabase
      .from("saved_posts")
      .select("post_id, created_at, posts(*)")
      .eq("user_id", myId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const posts = (data ?? []).map((r: any) => r.posts).filter(Boolean);
    return (await hydratePosts(supabase, posts, myId ?? null)) as FeedPost[];
  });
  return { posts: data ?? [], mutate };
}

