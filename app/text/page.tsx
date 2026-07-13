"use client";

import { useEffect, useRef } from "react";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useFollowingFeed, useFollowCounts } from "@/lib/supabase/hooks";
import TextPostCard from "@/components/feed/TextPostCard";
import SuggestedFollows from "@/components/SuggestedFollows";
import PageHeader from "@/components/PageHeader";

export default function FollowingTextPage() {
  const { userId } = useCurrentProfile();
  const { posts, loadMore, hasMore, loading, patchPost, removePost } = useFollowingFeed(userId);
  const { counts } = useFollowCounts(userId ?? undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Following" subtitle="Text posts, chronological" />
      {showSuggestions && <SuggestedFollows />}
      {posts.length === 0 && !loading ? (
        <div className="px-6 py-16 text-center text-muted">
          <p className="mb-1">Nothing here yet.</p>
          <p className="text-sm">Follow more accounts to see their text posts.</p>
        </div>
      ) : (
        posts.map((post) => (
          <TextPostCard key={post.id} post={post} onPatch={patchPost} onDeleted={() => removePost(post.id)} />
        ))
      )}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
