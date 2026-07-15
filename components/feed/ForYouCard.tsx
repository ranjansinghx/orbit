"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FeedPost } from "@/lib/supabase/hooks";
import { useProfileById } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { toggleLike, registerView, registerShare, recordWatchTime } from "@/lib/supabase/actions";
import { useInView } from "@/hooks/useInView";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import HashtagText from "@/components/HashtagText";
import PostOptionsMenu from "@/components/PostOptionsMenu";
import { compactNumber } from "@/lib/format";
import { HeartIcon, CommentIcon, ShareIcon } from "@/components/icons";

export default function ForYouCard({
  post,
  onPatch,
  onDeleted,
}: {
  post: FeedPost;
  onPatch: (id: string, patch: Partial<FeedPost>) => void;
  onDeleted?: () => void;
}) {
  const author = useProfileById(post.author_id);
  const openComments = useUIStore((s) => s.openComments);
  const openLikers = useUIStore((s) => s.openLikers);
  const showToast = useUIStore((s) => s.showToast);

  const { ref, inView } = useInView<HTMLDivElement>(0.65);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const hasCountedView = useRef(false);
  const [burst, setBurst] = useState(false);
  const maxWatchRatio = useRef(0);
  const hasSubmittedWatchTime = useRef(false);

  useEffect(() => {
    if (inView && !hasCountedView.current) {
      hasCountedView.current = true;
      registerView(post.id).catch(() => {});
      onPatch(post.id, { view_count: post.view_count + 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      hasSubmittedWatchTime.current = false;
      v.play().catch(() => {});
    } else {
      v.pause();
      // Submit whatever fraction of the clip was watched once it scrolls
      // out of view — this is the real signal behind watch_time_ratio in
      // the ranking formula, not a placeholder.
      if (post.type === "video" && maxWatchRatio.current > 0 && !hasSubmittedWatchTime.current) {
        hasSubmittedWatchTime.current = true;
        recordWatchTime(post.id, maxWatchRatio.current).catch(() => {});
        maxWatchRatio.current = 0;
      }
    }
  }, [inView, post.id, post.type]);

  useEffect(() => {
    return () => {
      // Submit on unmount too (e.g. navigating away mid-watch).
      if (post.type === "video" && maxWatchRatio.current > 0 && !hasSubmittedWatchTime.current) {
        recordWatchTime(post.id, maxWatchRatio.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const ratio = v.currentTime / v.duration;
    if (ratio > maxWatchRatio.current) maxWatchRatio.current = ratio;
  }

  async function handleLike() {
    const wasLiked = post.liked_by_me;
    onPatch(post.id, {
      liked_by_me: !wasLiked,
      like_count: post.like_count + (wasLiked ? -1 : 1),
    });
    if (!wasLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    }
    try {
      await toggleLike(post.id);
    } catch (err) {
      console.error(err);
      onPatch(post.id, { liked_by_me: wasLiked, like_count: post.like_count });
    }
  }

  function handleDoubleTap() {
    if (!post.liked_by_me) handleLike();
    else {
      setBurst(true);
      setTimeout(() => setBurst(false), 500);
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).catch(() => {});
    }
    showToast("Link copied");
    onPatch(post.id, { share_count: post.share_count + 1 });
    registerShare(post.id).catch(() => {});
  }

  if (!author) return <div ref={ref} className="h-[100dvh] w-full snap-start bg-ink" />;

  return (
    <div
      ref={ref}
      className="relative h-[100dvh] w-full snap-start bg-black flex items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleTap}
    >
      {post.type === "video" ? (
        <video
          ref={videoRef}
          src={post.media_urls[0]}
          muted={muted}
          loop
          playsInline
          onTimeUpdate={handleTimeUpdate}
          className="h-full w-full object-cover"
        />
      ) : (
        <button
          className="h-full w-full relative"
          onClick={() =>
            post.media_urls.length > 1 && setCarouselIdx((i) => (i + 1) % post.media_urls.length)
          }
          aria-label="Advance carousel"
        >
          <img src={post.media_urls[carouselIdx]} alt={post.caption} className="h-full w-full object-cover" />
          {post.media_urls.length > 1 && (
            <div className="absolute top-3 inset-x-3 flex gap-1">
              {post.media_urls.map((_, i) => (
                <div key={i} className={`h-0.5 flex-1 rounded-full ${i === carouselIdx ? "bg-paper" : "bg-paper/30"}`} />
              ))}
            </div>
          )}
        </button>
      )}

      {burst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <HeartIcon filled size={96} className="animate-pop-in drop-shadow-lg" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {post.type === "video" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className="absolute top-4 right-4 bg-black/40 rounded-full px-3 py-1.5 text-xs font-mono backdrop-blur-sm"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      )}

      <div className="absolute top-3 left-3 bg-black/40 rounded-full backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
        <PostOptionsMenu postId={post.id} authorId={author.id} onDeleted={onDeleted} />
      </div>

      <div className="absolute left-0 right-16 bottom-6 md:bottom-8 px-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${author.username}`}>
            <Avatar src={author.avatar_url || `https://i.pravatar.cc/150?u=${author.id}`} alt={author.display_name} size={38} />
          </Link>
          <Link href={`/profile/${author.username}`} className="font-semibold text-[15px]">
            @{author.username}
          </Link>
          <FollowButton userId={author.id} size="sm" variant="outline" />
        </div>
        <HashtagText text={post.caption} className="text-[14px] leading-snug text-paper/95 max-w-md" />
      </div>

      <div className="absolute right-3 bottom-24 md:bottom-16 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <HeartIcon filled={post.liked_by_me} size={30} />
          <span
            className="text-[11px] font-mono"
            onClick={(e) => {
              e.stopPropagation();
              if (post.like_count > 0) openLikers(post.id);
            }}
          >
            {compactNumber(post.like_count)}
          </span>
        </button>
        <button
          onClick={() => openComments(post.id)}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <CommentIcon size={28} />
          <span className="text-[11px] font-mono">{compactNumber(post.comment_count)}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <ShareIcon size={27} />
          <span className="text-[11px] font-mono">{compactNumber(post.share_count)}</span>
        </button>
      </div>
    </div>
  );
}
