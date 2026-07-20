"use client";

import { useEffect, useRef } from "react";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useFollowingFeed, useFollowCounts } from "@/lib/supabase/hooks";
import { useWindowPullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipeNavigate } from "@/hooks/useSwipeNavigate";
import TextPostCard from "@/components/feed/TextPostCard";
import PendingPostCard from "@/components/feed/PendingPostCard";
import { usePendingPostsStore } from "@/lib/store/usePendingPostsStore";
import { useUIStore } from "@/lib/store/useUIStore";
import SuggestedFollows from "@/components/SuggestedFollows";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { TextFeedSkeleton } from "@/components/Skeleton";
import OrbitMark from "@/components/OrbitMark";

export default function FollowingTextPage() {
  const { userId } = useCurrentProfile();
  const { posts, loadMore, hasMore, loading, patchPost, removePost, refresh, refreshing } = useFollowingFeed(userId);
  const { counts } = useFollowCounts(userId ?? undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Swipe right → Home. There's nothing further right than Following, so
  // leftHref (a left-swipe target) is null.
  const swipeRef = useSwipeNavigate<HTMLDivElement>("/", null);

  const { pullDistance, threshold } = useWindowPullToRefresh(refresh);
  const pendingPosts = usePendingPostsStore((s) => s.pendingPosts).filter((p) => p.type === "text");

  // A post successfully created in Composer bumps this signal so the real
  // post replaces its pending placeholder above.
  const followingRefreshSignal = useUIStore((s) => s.followingRefreshSignal);
  const isFirstFollowingSignal = useRef(true);
  useEffect(() => {
    if (isFirstFollowingSignal.current) {
      isFirstFollowingSignal.current = false;
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingRefreshSignal]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && hasMore && !loading && loadMore(),
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // Show the nudge to anyone who follows few people, not just when the feed is empty —
  // catches the case where you follow one or two accounts that haven't posted text yet.
  const showSuggestions = counts.following < 8;

  return (
    <div ref={swipeRef} className="max-w-2xl mx-auto border-x border-line min-h-screen relative">
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex justify-center transition-[height] overflow-hidden"
          style={{ height: refreshing ? threshold : pullDistance }}
        >
          <div className="self-end mb-2 w-7 h-7 rounded-full bg-surface2 border border-line flex items-center justify-center">
            <OrbitMark size={16} spin={refreshing} />
          </div>
        </div>
      )}
      <PageHeader title="Following" subtitle="Text posts, chronological" />
      {showSuggestions && <SuggestedFollows />}
      {posts.length === 0 && loading && <TextFeedSkeleton />}
      {pendingPosts.map((p) => (
        <PendingPostCard key={p.id} post={p} variant="row" />
      ))}
      {posts.length === 0 && !loading && pendingPosts.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Follow more accounts to see their text posts show up here."
        />
      ) : (
        posts.map((post) => (
          <TextPostCard key={post.id} post={post} onPatch={patchPost} onDeleted={() => removePost(post.id)} />
        ))
      )}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
