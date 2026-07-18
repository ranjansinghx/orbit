"use client";

import { useState } from "react";
import { CommentRow, useCommentReplies, useProfilesMap } from "@/lib/supabase/hooks";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { deleteComment, toggleCommentLike } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import HashtagText from "@/components/HashtagText";
import { TrashIcon, HeartIcon, ReplyIcon } from "@/components/icons";
import { timeAgo } from "@/lib/format";

export default function CommentThread({
  comment,
  onReply,
  onChanged,
}: {
  comment: CommentRow;
  onReply: (comment: CommentRow) => void;
  onChanged: () => void;
}) {
  const { userId } = useCurrentProfile();
  const author = useProfilesMap([comment.author_id])[comment.author_id];
  const [liked, setLiked] = useState(comment.liked_by_me);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [repliesOpen, setRepliesOpen] = useState(false);

  const { replies, mutate: mutateReplies } = useCommentReplies(repliesOpen ? comment.id : undefined, userId);
  const replyAuthorIds = replies.map((r) => r.author_id);
  const replyAuthors = useProfilesMap(replyAuthorIds);

  if (!author) return null;

  async function handleLike() {
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => n + (was ? -1 : 1));
    try {
      await toggleCommentLike(comment.id);
    } catch (err) {
      console.error(err);
      setLiked(was);
      setLikeCount((n) => n + (was ? 1 : -1));
    }
  }

  async function handleDelete(id: string, refresh: () => void) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(id);
      refresh();
      onChanged();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="py-3">
      <div className="flex gap-3">
        <Avatar src={author.avatar_url} alt={author.display_name} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold mr-1.5">{author.username}</span>
            <HashtagText text={comment.body} className="text-paper/90" />
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-muted font-mono">{timeAgo(comment.created_at)}</span>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-[11px] transition-colors ${liked ? "text-video" : "text-muted hover:text-text"}`}
            >
              <HeartIcon filled={liked} size={12} />
              {likeCount > 0 && <span className="font-mono">{likeCount}</span>}
            </button>
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-text transition-colors"
            >
              <ReplyIcon size={12} />
              Reply
            </button>
          </div>
          {comment.reply_count > 0 && !repliesOpen && (
            <button
              onClick={() => setRepliesOpen(true)}
              className="text-xs text-muted hover:text-text mt-2 font-medium"
            >
              — View {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
            </button>
          )}
          {repliesOpen && (
            <div className="mt-1 flex flex-col gap-3 border-l border-line pl-3">
              {replies.map((r) => {
                const ra = replyAuthors[r.author_id];
                if (!ra) return null;
                return (
                  <div key={r.id} className="flex gap-2.5">
                    <Avatar src={ra.avatar_url} alt={ra.display_name} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold mr-1.5">{ra.username}</span>
                        <HashtagText text={r.body} className="text-paper/90" />
                      </p>
                      <span className="text-[11px] text-muted font-mono">{timeAgo(r.created_at)}</span>
                    </div>
                    {r.author_id === userId && (
                      <button
                        onClick={() => handleDelete(r.id, mutateReplies)}
                        className="p-1 text-muted hover:text-danger transition-colors shrink-0 self-start"
                        aria-label="Delete reply"
                      >
                        <TrashIcon size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {comment.author_id === userId && (
          <button
            onClick={() => handleDelete(comment.id, mutateReplies)}
            className="p-1 text-muted hover:text-danger transition-colors shrink-0 self-start"
            aria-label="Delete comment"
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
