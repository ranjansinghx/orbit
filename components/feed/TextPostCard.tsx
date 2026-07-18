"use client";

import Link from "next/link";
import { FeedPost, useProfileById } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { toggleLike, registerShare, toggleRepost } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import HashtagText from "@/components/HashtagText";
import PostOptionsMenu from "@/components/PostOptionsMenu";
import { compactNumber, timeAgo } from "@/lib/format";
import { HeartIcon, CommentIcon, ShareIcon, RepostIcon } from "@/components/icons";

export default function TextPostCard({
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
  const reposter = useProfileById(post.reposted_by ?? undefined);
  const openComments = useUIStore((s) => s.openComments);
  const openLikers = useUIStore((s) => s.openLikers);
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

  async function handleRepost(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const was = post.reposted_by_me;
    onPatch?.(post.id, { reposted_by_me: !was, repost_count: post.repost_count + (was ? -1 : 1) });
    try {
      const nowReposted = await toggleRepost(post.id);
      showToast(nowReposted ? "Reposted to your Following feed" : "Repost removed");
    } catch (err) {
      console.error(err);
      onPatch?.(post.id, { reposted_by_me: was, repost_count: post.repost_count });
    }
  }

  function handleShowLikers(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (post.like_count > 0) openLikers(post.id);
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
      className="flex flex-col gap-1.5 px-4 py-4 border-b border-line hover:bg-surface/40 transition-colors"
    >
      {post.reposted_by && reposter && (
        <div className="flex items-center gap-1.5 text-xs text-muted pl-11 -mb-0.5">
          <RepostIcon size={13} />
          <span>Reposted by {reposter.display_name}</span>
        </div>
      )}
      {post.quote && (
        <div className="pl-11 -mb-0.5">
          <p className="text-[15px] leading-relaxed">{post.quote}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Avatar
          src={author.avatar_url}
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
            {post.edited_at && <span className="text-muted text-xs">· edited</span>}
            <span className="ml-auto shrink-0" onClick={(e) => e.preventDefault()}>
              <PostOptionsMenu postId={post.id} authorId={author.id} onDeleted={onDeleted} onUnsaved={onUnsaved} />
            </span>
          </div>
          <HashtagText text={post.caption} className="text-[15px] leading-relaxed block mt-0.5" />

          <div className="flex items-center gap-6 mt-3 max-w-md">
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
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 transition-colors ${
                post.reposted_by_me ? "text-text" : "text-muted hover:text-text"
              }`}
            >
              <RepostIcon active={post.reposted_by_me} size={17} />
              <span className="text-xs font-mono">{compactNumber(post.repost_count)}</span>
            </button>
            <button onClick={handleLike} className="flex items-center gap-1.5 text-muted hover:text-video transition-colors">
              <HeartIcon filled={post.liked_by_me} size={17} />
              <span className="text-xs font-mono" onClick={handleShowLikers}>
                {compactNumber(post.like_count)}
              </span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-muted hover:text-paper transition-colors">
              <ShareIcon size={16} />
              <span className="text-xs font-mono">{compactNumber(post.share_count)}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
