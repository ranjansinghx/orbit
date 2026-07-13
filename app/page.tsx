"use client";

import { useRef } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useForYouFeed } from "@/lib/supabase/hooks";
import ForYouCard from "@/components/feed/ForYouCard";
import OrbitMark from "@/components/OrbitMark";

export default function HomePage() {
  const { userId } = useCurrentProfile();
  const { posts, loadMore, hasMore, loading, patchPost, removePost } = useForYouFeed(userId);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 2) {
      loadMore();
    }
  }

  return (
    <div className="relative">
      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <OrbitMark size={22} />
          <span className="font-display italic text-lg">Orbit</span>
        </div>
        <Link
          href="/text"
          className="pointer-events-auto text-xs font-mono text-muted bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5"
        >
          Following →
        </Link>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[100dvh] w-full overflow-y-scroll snap-feed no-scrollbar"
      >
        {posts.map((post) => (
          <ForYouCard key={post.id} post={post} onPatch={patchPost} onDeleted={() => removePost(post.id)} />
        ))}
        {posts.length === 0 && !loading && (
          <div className="h-[100dvh] flex flex-col items-center justify-center text-muted gap-2 px-6 text-center">
            <p>No video or photo posts yet.</p>
            <p className="text-sm">Be the first — tap Post to share one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
