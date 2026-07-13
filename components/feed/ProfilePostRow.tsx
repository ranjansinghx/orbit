"use client";

import Link from "next/link";
import { FeedPost, useProfileById } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { toggleLike, registerShare } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import HashtagText from "@/components/HashtagText";
import PostOptionsMenu from "@/components/PostOptionsMenu";
import { compactNumber, timeAgo } from "@/lib/format";
import { HeartIcon, CommentIcon, ShareIcon, VideoIcon } from "@/components/icons";

/** One row in a profile's unified post list — works for text, photo, and video posts alike. */
export default function ProfilePostRow({
  post,
  onPatch,
  onDeleted,
  onUnsaved,
}: {
  post: FeedPost;
  onPatch?: (id: string, patch: Partial<FeedPost>) => void;
  onDeleted?: () => void;
  onUnsaved?: () => void;
}) {
  const author = useProfileById(post.author_id);
  const openComments = useUIStore((s) => s.openComments);
  const showToast = useUIStore((s) => s.showToast);

  if (!author) return null;

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const wasLiked = post.liked_by_me;
    onPatch?.(post.id, { liked_by_me: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
    try {
      await toggleLike(post.id);
    } catch (err) {
      console.error(err);
      onPatch?.(post.id, { liked_by_me: wasLiked, like_count: post.like_count });
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).catch(() => {});
    }
    showToast("Link copied");
    onPatch?.(post.id, { share_count: post.share_count + 1 });
    registerShare(post.id).catch(() => {});
  }

  return (
    <Link
      href={`/post/${post.id}`}
      className="flex gap-3 px-4 py-4 border-b border-line hover:bg-surface/40 transition-colors"
    >
      <Avatar
        src={author.avatar_url || `https://i.pravatar.cc/150?u=${author.id}`}
        alt={author.display_name}
        size={42}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[15px]">
          <span className="font-semibold truncate">{author.display_name}</span>
          <span className="text-muted truncate">@{author.username}</span>
          <span className="text-muted">·</span>
          <span className="text-muted font-mono text-xs">{timeAgo(post.created_at)}</span>
          <span className="ml-auto shrink-0 flex items-center gap-1" onClick={(e) => e.preventDefault()}>
            {post.type !== "text" && (
              <span className="text-muted">
                <VideoIcon size={14} />
              </span>
            )}
            <PostOptionsMenu postId={post.id} authorId={author.id} onDeleted={onDeleted} onUnsaved={onUnsaved} />
          </span>
        </div>

        {post.caption && (
          <HashtagText text={post.caption} className="text-[15px] leading-relaxed block mt-0.5" />
        )}

        {post.type !== "text" && post.media_urls[0] && (
          <div className="mt-2 rounded-xl overflow-hidden bg-surface2 max-w-[260px] aspect-[9/16]">
            {post.type === "photo" ? (
              <img src={post.media_urls[0]} alt={post.caption} className="w-full h-full object-cover" />
            ) : (
              <video src={post.media_urls[0]} className="w-full h-full object-cover" muted />
            )}
          </div>
        )}

        <div className="flex items-center gap-8 mt-3 max-w-xs">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openComments(post.id);
            }}
            className="flex items-center gap-1.5 text-muted hover:text-text transition-colors"
          >
            <CommentIcon size={17} />
            <span className="text-xs font-mono">{compactNumber(post.comment_count)}</span>
          </button>
          <button onClick={handleLike} className="flex items-center gap-1.5 text-muted hover:text-video transition-colors">
            <HeartIcon filled={post.liked_by_me} size={17} />
            <span className="text-xs font-mono">{compactNumber(post.like_count)}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-muted hover:text-paper transition-colors">
            <ShareIcon size={16} />
            <span className="text-xs font-mono">{compactNumber(post.share_count)}</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
