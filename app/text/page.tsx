"use client";

import { useEffect, useRef } from "react";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useFollowingFeed, useFollowCounts } from "@/lib/supabase/hooks";
import { useWindowPullToRefresh } from "@/hooks/usePullToRefresh";
import TextPostCard from "@/components/feed/TextPostCard";
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

  const { pullDistance, threshold } = useWindowPullToRefresh(refresh);

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
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen relative">
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
      {posts.length === 0 && !loading ? (
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
