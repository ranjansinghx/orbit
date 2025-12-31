"use client";

import { useEffect, useRef } from "react";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useFollowingFeed } from "@/lib/supabase/hooks";
import TextPostCard from "@/components/feed/TextPostCard";
import PageHeader from "@/components/PageHeader";

export default function FollowingTextPage() {
  const { userId } = useCurrentProfile();
  const { posts, loadMore, hasMore, loading, patchPost } = useFollowingFeed(userId);
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

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Following" subtitle="Text posts, chronological" />
      {posts.length === 0 && !loading ? (
        <div className="px-6 py-16 text-center text-muted">
          <p className="mb-1">Nothing here yet.</p>
          <p className="text-sm">Follow more accounts to see their text posts.</p>
        </div>
      ) : (
        posts.map((post) => <TextPostCard key={post.id} post={post} onPatch={patchPost} />)
      )}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
