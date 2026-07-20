"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useForYouFeed } from "@/lib/supabase/hooks";
import { toggleLike } from "@/lib/supabase/actions";
import { useUIStore } from "@/lib/store/useUIStore";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipeNavigate } from "@/hooks/useSwipeNavigate";
import ForYouCard from "@/components/feed/ForYouCard";
import PendingPostCard from "@/components/feed/PendingPostCard";
import { usePendingPostsStore } from "@/lib/store/usePendingPostsStore";
import OrbitMark from "@/components/OrbitMark";
import EmptyState from "@/components/EmptyState";
import { ForYouSkeleton } from "@/components/Skeleton";
import { TextIcon, SearchIcon } from "@/components/icons";

export default function HomePage() {
  const { userId } = useCurrentProfile();
  const { posts, loadMore, hasMore, loading, patchPost, removePost, refresh, refreshing } = useForYouFeed(userId);
  const openComments = useUIStore((s) => s.openComments);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pullDistance, threshold } = usePullToRefresh(containerRef, refresh);
  const pendingPosts = usePendingPostsStore((s) => s.pendingPosts).filter((p) => p.type !== "text");
  // Swipe left → Following (there's nothing further right than Home, so
  // rightHref is null — a right-swipe here does nothing).
  useSwipeNavigate(containerRef, null, "/text");

  // Double-tapping the Home nav icon while already on this page scrolls to
  // top and reloads page one — see BottomTabs/SidebarNav's handleHomeClick.
  const homeRefreshSignal = useUIStore((s) => s.homeRefreshSignal);
  const isFirstRefreshSignal = useRef(true);
  useEffect(() => {
    if (isFirstRefreshSignal.current) {
      isFirstRefreshSignal.current = false;
      return;
    }
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeRefreshSignal]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 2) {
      loadMore();
    }
  }

  // Keyboard shortcuts: j/k move one card, l likes the card in view, r opens
  // its comments. Desktop-only in practice (mobile has no keyboard), but
  // harmless to leave listening everywhere.
  const activePost = useMemo(() => {
    const el = containerRef.current;
    if (!el) return posts[0] ?? null;
    const idx = Math.round(el.scrollTop / (el.clientHeight || window.innerHeight));
    return posts[idx] ?? null;
  }, [posts]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const el = containerRef.current;
      if (!el) return;
      const cardHeight = el.clientHeight || window.innerHeight;

      if (e.key === "j") {
        e.preventDefault();
        el.scrollBy({ top: cardHeight, behavior: "smooth" });
      } else if (e.key === "k") {
        e.preventDefault();
        el.scrollBy({ top: -cardHeight, behavior: "smooth" });
      } else if (e.key === "l") {
        const idx = Math.round(el.scrollTop / cardHeight);
        const post = posts[idx];
        if (!post) return;
        const wasLiked = post.liked_by_me;
        patchPost(post.id, { liked_by_me: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
        toggleLike(post.id).catch(() => {
          patchPost(post.id, { liked_by_me: wasLiked, like_count: post.like_count });
        });
      } else if (e.key === "r") {
        const idx = Math.round(el.scrollTop / cardHeight);
        const post = posts[idx];
        if (post) openComments(post.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  return (
    <div className="relative">
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <OrbitMark size={22} />
          <span className="font-display italic text-lg">Orbit</span>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            href="/text"
            aria-label="Following (text feed)"
            className="bg-black/40 backdrop-blur-sm rounded-full p-2"
          >
            <TextIcon size={19} active />
          </Link>
          <Link
            href="/search"
            aria-label="Search"
            className="bg-black/40 backdrop-blur-sm rounded-full p-2"
          >
            <SearchIcon size={19} active />
          </Link>
        </div>
      </div>

      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 inset-x-0 z-40 flex justify-center pointer-events-none transition-transform"
          style={{ transform: `translateY(${Math.max(pullDistance, refreshing ? threshold : 0) - 40}px)` }}
        >
          <div className="mt-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <OrbitMark size={16} spin={refreshing} />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[100dvh] w-full overflow-y-scroll snap-feed no-scrollbar"
      >
        {posts.length === 0 && loading && (
          <>
            <ForYouSkeleton />
            <ForYouSkeleton />
          </>
        )}
        {pendingPosts.map((p) => (
          <PendingPostCard key={p.id} post={p} variant="snap" />
        ))}
        {posts.map((post) => (
          <ForYouCard key={post.id} post={post} onPatch={patchPost} onDeleted={() => removePost(post.id)} />
        ))}
        {posts.length === 0 && !loading && pendingPosts.length === 0 && (
          <div className="h-[100dvh] flex items-center justify-center">
            <EmptyState title="No posts yet" body="Be the first — tap Post to share a video or photo." />
          </div>
        )}
      </div>
    </div>
  );
}
