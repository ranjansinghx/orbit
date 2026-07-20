"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { usePost, useComments, useProfileById, CommentRow } from "@/lib/supabase/hooks";
import { toggleLike, addComment, registerShare, toggleRepost } from "@/lib/supabase/actions";
import { useUIStore } from "@/lib/store/useUIStore";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import HashtagText from "@/components/HashtagText";
import PostOptionsMenu from "@/components/PostOptionsMenu";
import CommentThread from "@/components/CommentThread";
import PollCard from "@/components/PollCard";
import { HeartIcon, CommentIcon, ShareIcon, SendIcon, RepostIcon } from "@/components/icons";
import { compactNumber, timeAgo } from "@/lib/format";
import { haptic } from "@/lib/haptics";

export default function PostDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { userId, profile: me } = useCurrentProfile();
  const { post, mutate: mutatePost } = usePost(params.id, userId);
  const author = useProfileById(post?.author_id);
  const { comments, mutate: mutateComments } = useComments(params.id, userId);
  const showToast = useUIStore((s) => s.showToast);
  const openLikers = useUIStore((s) => s.openLikers);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);

  if (!post || !author) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 text-muted">
        Loading...{" "}
        <button className="underline" onClick={() => router.push("/")}>
          Go home
        </button>
      </div>
    );
  }

  async function handleLike() {
    const wasLiked = post!.liked_by_me;
    mutatePost({ ...post!, liked_by_me: !wasLiked, like_count: post!.like_count + (wasLiked ? -1 : 1) }, {
      revalidate: false,
    });
    try {
      await toggleLike(post!.id);
    } catch (err) {
      console.error(err);
      mutatePost();
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post!.id}`;
    haptic("tap");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title: post!.caption || "A post on Orbit" });
      } catch {
        return;
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      showToast("Link copied");
    }
    registerShare(post!.id).catch(() => {});
    mutatePost();
  }

  async function handleRepost() {
    const was = post!.reposted_by_me;
    mutatePost(
      { ...post!, reposted_by_me: !was, repost_count: post!.repost_count + (was ? -1 : 1) },
      { revalidate: false }
    );
    try {
      const nowReposted = await toggleRepost(post!.id);
      showToast(nowReposted ? "Reposted to your Following feed" : "Repost removed");
    } catch (err) {
      console.error(err);
      mutatePost();
    }
  }

  async function submitComment() {
    if (!draft.trim() || !userId) return;
    setPosting(true);
    const body = draft.trim();
    const parentId = replyTo?.id ?? null;
    setDraft("");
    setReplyTo(null);
    try {
      await addComment(post!.id, userId, body, parentId);
      mutateComments();
      mutatePost();
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <div className="sticky top-0 z-20 bg-ink/90 backdrop-blur-sm border-b border-line px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl leading-none px-1" aria-label="Back">
          ←
        </button>
        <span className="font-display italic text-lg">Post</span>
      </div>

      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2.5 mb-3">
          <Link href={`/profile/${author.username}`}>
            <Avatar src={author.avatar_url} alt={author.display_name} size={44} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${author.username}`} className="font-semibold block truncate">
              {author.display_name}
            </Link>
            <span className="text-muted text-sm">@{author.username}</span>
          </div>
          <FollowButton userId={author.id} size="sm" variant="outline" />
          <PostOptionsMenu postId={post.id} authorId={author.id} onDeleted={() => router.push("/")} />
        </div>

        {post.type !== "text" && (
          <div className="rounded-xl overflow-hidden bg-black mb-3 max-h-[70vh] flex items-center justify-center">
            {post.type === "photo" ? (
              <img src={post.media_urls[0]} alt={post.caption} className="w-full object-contain max-h-[70vh]" />
            ) : (
              <video src={post.media_urls[0]} controls className="w-full max-h-[70vh]" />
            )}
          </div>
        )}

        <HashtagText text={post.caption} className="text-[15px] leading-relaxed block" />
        <PollCard postId={post.id} />
        <p className="text-xs text-muted font-mono mt-2">
          {timeAgo(post.created_at)} · {compactNumber(post.view_count)} views{post.edited_at ? " · edited" : ""}
        </p>

        <div className="flex items-center gap-8 mt-4">
          <button onClick={handleLike} className="flex items-center gap-2 text-muted hover:text-video transition-colors">
            <HeartIcon filled={post.liked_by_me} size={22} />
            <span
              className="text-sm font-mono"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (post.like_count > 0) openLikers(post.id);
              }}
            >
              {compactNumber(post.like_count)}
            </span>
          </button>
          {post.type === "text" && (
            <button
              onClick={handleRepost}
              className={`flex items-center gap-2 transition-colors ${
                post.reposted_by_me ? "text-text" : "text-muted hover:text-text"
              }`}
            >
              <RepostIcon active={post.reposted_by_me} size={20} />
              <span className="text-sm font-mono">{compactNumber(post.repost_count)}</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-muted">
            <CommentIcon size={21} />
            <span className="text-sm font-mono">{compactNumber(post.comment_count)}</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-2 text-muted hover:text-paper transition-colors">
            <ShareIcon size={20} />
            <span className="text-sm font-mono">{compactNumber(post.share_count)}</span>
          </button>
        </div>
      </div>

      {replyTo && (
        <div className="flex items-center justify-between px-5 pt-2 text-xs text-muted border-b border-line pb-2 bg-surface2">
          <span>
            Replying to: <span className="text-text">{replyTo.body.length > 50 ? `${replyTo.body.slice(0, 50)}...` : replyTo.body}</span>
          </span>
          <button onClick={() => setReplyTo(null)} className="hover:text-text">
            Cancel
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
        {me && <Avatar src={me.avatar_url} alt={me.display_name} size={34} />}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitComment()}
          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
          className="flex-1 bg-surface2 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted border border-line focus:border-muted"
        />
        <button onClick={submitComment} disabled={!draft.trim() || posting} className="disabled:opacity-30" aria-label="Send comment">
          <SendIcon />
        </button>
      </div>

      <div className="px-5 divide-y divide-line">
        {comments.map((c) => (
          <CommentThread
            key={c.id}
            comment={c}
            onReply={(comment) => setReplyTo(comment)}
            onChanged={() => {
              mutateComments();
              mutatePost();
            }}
          />
        ))}
      </div>
    </div>
  );
}
