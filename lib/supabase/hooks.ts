"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/supabase/useAuth";
import { PostType, PostAudience, ReplyPermission } from "@/lib/supabase/database.types";

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
  repost_count: number;
  watch_time_ratio: number;
  liked_by_me: boolean;
  reposted_by_me: boolean;
  hashtags: string[];
  reposted_by?: string | null; // set on Following feed items that arrived via a repost
  quote?: string | null; // set on Following feed items that arrived via a quote-repost
  edited_at?: string | null;
  audience?: PostAudience;
  reply_permission?: ReplyPermission;
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

  const [{ data: likedRows }, { data: repostedRows }, { data: tagRows }] = await Promise.all([
    viewerId
      ? supabase.from("likes").select("post_id").eq("user_id", viewerId).in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    viewerId
      ? supabase.from("reposts").select("post_id").eq("user_id", viewerId).in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    supabase
      .from("post_hashtags")
      .select("post_id, hashtags(tag)")
      .in("post_id", ids),
  ]);

  const likedSet = new Set((likedRows ?? []).map((r) => r.post_id));
  const repostedSet = new Set((repostedRows ?? []).map((r) => r.post_id));
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
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
    share_count: r.share_count ?? 0,
    repost_count: r.repost_count ?? 0,
    view_count: r.view_count ?? 0,
    liked_by_me: likedSet.has(r.id),
    reposted_by_me: repostedSet.has(r.id),
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
    const withDefaults = hydrated.map((p) => ({ ...p, repost_count: 0, reposted_by_me: false }));
    setPosts((prev) => [...prev, ...withDefaults]);
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

  // Resets to a clean slate and reloads page one — used by pull-to-refresh.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (viewerId === undefined) return;
    setRefreshing(true);
    const { data, error } = await supabase.rpc("get_for_you_feed", {
      p_viewer_id: viewerId ?? "00000000-0000-0000-0000-000000000000",
      p_cursor_score: null,
      p_cursor_id: null,
      p_limit: PAGE_SIZE,
    });
    setRefreshing(false);
    if (error || !data) {
      console.error(error);
      return;
    }
    const hydrated = await hydratePosts(supabase, data, viewerId ?? null);
    const withDefaults = hydrated.map((p) => ({ ...p, repost_count: 0, reposted_by_me: false }));
    setPosts(withDefaults);
    setCursor(data.length > 0 ? { score: data[data.length - 1].score, id: data[data.length - 1].id } : null);
    setDone(data.length < PAGE_SIZE);
  }, [viewerId, supabase]);

  return { posts, loadMore: load, hasMore: !done, loading, patchPost, removePost, refresh, refreshing };
}

/** Following: chronological text-only feed from followed accounts. */
export function useFollowingFeed(viewerId: string | null | undefined) {
  const supabase = createClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<{ ts: string; id: string } | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewerId || loading || done) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_following_feed", {
      p_viewer_id: viewerId,
      p_cursor_ts: cursor?.ts ?? null,
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
    const hydrated = await hydratePosts(supabase, data, viewerId);
    // hydratePosts spreads the raw RPC row, which already includes
    // reposted_by, quote, edited_at, and effective_time — just carry them through.
    const merged = hydrated.map((p, i) => ({
      ...p,
      reposted_by: (data[i] as any).reposted_by as string | null,
      quote: (data[i] as any).quote as string | null,
      edited_at: (data[i] as any).edited_at as string | null,
    }));
    setPosts((prev) => [...prev, ...merged]);
    const last = data[data.length - 1] as any;
    setCursor({ ts: last.effective_time, id: last.id });
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

  // Resets to a clean slate and reloads page one — used by pull-to-refresh.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!viewerId) return;
    setRefreshing(true);
    const { data, error } = await supabase.rpc("get_following_feed", {
      p_viewer_id: viewerId,
      p_cursor_ts: null,
      p_cursor_id: null,
      p_limit: PAGE_SIZE,
    });
    setRefreshing(false);
    if (error || !data) {
      console.error(error);
      return;
    }
    const hydrated = await hydratePosts(supabase, data, viewerId);
    const merged = hydrated.map((p, i) => ({
      ...p,
      reposted_by: (data[i] as any).reposted_by as string | null,
      quote: (data[i] as any).quote as string | null,
      edited_at: (data[i] as any).edited_at as string | null,
    }));
    setPosts(merged);
    setCursor(data.length > 0 ? { ts: (data[data.length - 1] as any).effective_time, id: data[data.length - 1].id } : null);
    setDone(data.length < PAGE_SIZE);
  }, [viewerId, supabase]);

  return { posts, loadMore: load, hasMore: !done, loading, patchPost, removePost, refresh, refreshing };
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

export function useLikers(postId: string | undefined) {
  const supabase = createClient();
  const { data } = useSWR(postId ? ["likers", postId] : null, async () => {
    const { data, error } = await supabase
      .from("likes")
      .select("user_id, created_at, profiles(*)")
      .eq("post_id", postId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profiles).filter(Boolean) as Profile[];
  });
  return { likers: data ?? [] };
}

export function useDrafts(userId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(userId ? ["drafts", userId] : null, async () => {
    const { data, error } = await supabase
      .from("drafts")
      .select("*")
      .eq("user_id", userId!)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  });
  return { drafts: data ?? [], mutate };
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: "post" | "user";
  target_id: string;
  reason: string;
  details: string | null;
  created_at: string;
  status: string;
}

/** Admin-only — RLS on the reports table only lets is_admin accounts SELECT. */
export function useReports(isAdmin: boolean | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(isAdmin ? ["reports"] : null, async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as ReportRow[];
  });
  return { reports: data ?? [], mutate };
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
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", userId!).eq("status", "accepted"),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId!).eq("status", "accepted"),
    ]);
    return { followers: followers ?? 0, following: following ?? 0 };
  });
  return { counts: data ?? { followers: 0, following: 0 }, mutate };
}

export type FollowRelationStatus = "none" | "pending" | "accepted";

/** Whether the viewer follows a target, and whether that follow is pending (private account) or accepted. */
export function useFollowStatus(viewerId: string | null | undefined, targetId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(
    viewerId && targetId ? ["follow-status", viewerId, targetId] : null,
    async () => {
      const { data } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", viewerId!)
        .eq("followee_id", targetId!)
        .maybeSingle();
      return (data?.status ?? "none") as FollowRelationStatus;
    }
  );
  return { status: data ?? "none", mutate };
}

export interface PendingFollowRequest {
  follower_id: string;
  created_at: string;
  profile: Profile;
}

/** Incoming follow requests awaiting approval — only meaningful for private accounts. */
export function usePendingFollowRequests(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["pending-follow-requests", myId] : null, async () => {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id, created_at, profiles!follows_follower_id_fkey(*)")
      .eq("followee_id", myId!)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .map((r: any) => ({ follower_id: r.follower_id, created_at: r.created_at, profile: r.profiles as Profile }))
      .filter((r) => r.profile) as PendingFollowRequest[];
  });
  return { requests: data ?? [], mutate };
}

export function useIsCloseFriend(ownerId: string | null | undefined, friendId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(
    ownerId && friendId ? ["is-close-friend", ownerId, friendId] : null,
    async () => {
      const { data } = await supabase
        .from("close_friends")
        .select("owner_id")
        .eq("owner_id", ownerId!)
        .eq("friend_id", friendId!)
        .maybeSingle();
      return !!data;
    }
  );
  return { isCloseFriend: !!data, mutate };
}

export function useCloseFriends(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["close-friends", myId] : null, async () => {
    const { data, error } = await supabase
      .from("close_friends")
      .select("friend_id, profiles!close_friends_friend_id_fkey(*)")
      .eq("owner_id", myId!);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profiles as Profile).filter(Boolean);
  });
  return { closeFriends: data ?? [], mutate };
}

export interface PollOptionResult {
  poll_id: string;
  closes_at: string | null;
  option_id: string;
  label: string;
  vote_count: number;
  total_votes: number;
  my_vote: boolean;
}

export function usePollResults(postId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(postId ? ["poll-results", postId] : null, async () => {
    const { data, error } = await supabase.rpc("get_poll_results", { p_post_id: postId! });
    if (error) throw error;
    return data as PollOptionResult[];
  });

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`poll-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, () => mutate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return { results: data ?? [], mutate };
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  post_count: number;
}

export function useCollections(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["collections", myId] : null, async () => {
    const { data, error } = await supabase
      .from("collections")
      .select("*, saved_posts(count)")
      .eq("user_id", myId!)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((c: any) => ({ ...c, post_count: c.saved_posts?.[0]?.count ?? 0 })) as Collection[];
  });
  return { collections: data ?? [], mutate };
}

/** Username prefix search, for the composer's @mention autocomplete dropdown. */
export function useMentionSuggestions(prefix: string) {
  const supabase = createClient();
  const clean = prefix.trim().toLowerCase();
  const { data } = useSWR(clean ? ["mention-suggestions", clean] : null, async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.${clean}%,display_name.ilike.${clean}%`)
      .limit(6);
    if (error) throw error;
    return (data ?? []) as Profile[];
  });
  return data ?? [];
}

/** Hashtag prefix search, for the composer's #tag autocomplete dropdown. */
export function useHashtagSuggestions(prefix: string) {
  const supabase = createClient();
  const clean = prefix.trim().toLowerCase();
  const { data } = useSWR(clean ? ["hashtag-suggestions", clean] : null, async () => {
    const { data, error } = await supabase.from("hashtags").select("tag").ilike("tag", `${clean}%`).order("tag").limit(6);
    if (error) throw error;
    return (data ?? []).map((r) => r.tag);
  });
  return data ?? [];
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

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  reply_count: number;
  like_count: number;
  liked_by_me: boolean;
}

/** Top-level comments only (parent_comment_id is null) — replies load lazily per-thread via useCommentReplies. */
export function useComments(postId: string | undefined, viewerId?: string | null) {
  const supabase = createClient();
  const { data, mutate } = useSWR(postId ? ["comments", postId, viewerId ?? null] : null, async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId!)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (await hydrateCommentLikes(supabase, data ?? [], viewerId ?? null)) as CommentRow[];
  });

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => mutate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
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

/** Replies to one comment — fetched on demand when a thread is expanded. */
export function useCommentReplies(commentId: string | undefined, viewerId?: string | null) {
  const supabase = createClient();
  const { data, mutate } = useSWR(commentId ? ["comment-replies", commentId, viewerId ?? null] : null, async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("parent_comment_id", commentId!)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (await hydrateCommentLikes(supabase, data ?? [], viewerId ?? null)) as CommentRow[];
  });
  return { replies: data ?? [], mutate };
}

async function hydrateCommentLikes(supabase: ReturnType<typeof createClient>, rows: any[], viewerId: string | null) {
  if (rows.length === 0 || !viewerId) return rows.map((r) => ({ ...r, liked_by_me: false }));
  const { data: likedRows } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", viewerId)
    .in("comment_id", rows.map((r) => r.id));
  const likedSet = new Set((likedRows ?? []).map((r) => r.comment_id));
  return rows.map((r) => ({ ...r, liked_by_me: likedSet.has(r.id) }));
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

export interface ConversationSummary {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  other_user_id: string | null; // set for 1:1 conversations
  member_count: number;
}

/** Every conversation the caller is part of — 1:1 or group, via the get_my_conversations RPC. */
export function useConversations(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["conversations", myId] : null, async () => {
    const { data, error } = await supabase.rpc("get_my_conversations");
    if (error) throw error;
    return data as ConversationSummary[];
  });

  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`conversations-${myId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => mutate())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => mutate())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return { conversations: data ?? [], mutate };
}

/** Member profiles of a group conversation (or a 1:1, though useProfileById is simpler for that case). */
export function useConversationParticipants(conversationId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(conversationId ? ["conversation-participants", conversationId] : null, async () => {
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("user_id, profiles(*)")
      .eq("conversation_id", conversationId!);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profiles as Profile).filter(Boolean);
  });
  return { participants: data ?? [], mutate };
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
    const [{ count: notifs }, { data: convRows }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", myId!)
        .is("read_at", null),
      supabase.rpc("get_my_conversations"),
    ]);
    let unreadMessages = 0;
    const convIds = ((convRows ?? []) as { id: string }[]).map((c) => c.id);
    if (convIds.length) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
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

export function useIsMuted(viewerId: string | null | undefined, targetId: string | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(
    viewerId && targetId ? ["is-muted", viewerId, targetId] : null,
    async () => {
      const { data } = await supabase
        .from("mutes")
        .select("user_id")
        .eq("user_id", viewerId!)
        .eq("muted_id", targetId!)
        .maybeSingle();
      return !!data;
    }
  );
  return { isMuted: !!data, mutate };
}

export function useMutedProfiles(myId: string | null | undefined) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["muted-profiles", myId] : null, async () => {
    const { data, error } = await supabase
      .from("mutes")
      .select("muted_id, profiles!mutes_muted_id_fkey(*)")
      .eq("user_id", myId!);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profiles as Profile).filter(Boolean);
  });
  return { muted: data ?? [], mutate };
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

export function useSavedFeed(myId: string | null | undefined, collectionId?: string | null) {
  const supabase = createClient();
  const { data, mutate } = useSWR(myId ? ["saved-feed", myId, collectionId ?? "all"] : null, async () => {
    let query = supabase
      .from("saved_posts")
      .select("post_id, created_at, collection_id, posts(*)")
      .eq("user_id", myId!)
      .order("created_at", { ascending: false });
    if (collectionId === null) query = query.is("collection_id", null);
    else if (collectionId) query = query.eq("collection_id", collectionId);
    const { data, error } = await query;
    if (error) throw error;
    const posts = (data ?? []).map((r: any) => r.posts).filter(Boolean);
    return (await hydratePosts(supabase, posts, myId ?? null)) as FeedPost[];
  });
  return { posts: data ?? [], mutate };
}

