"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useComments, usePost, CommentRow } from "@/lib/supabase/hooks";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { addComment } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import CommentThread from "@/components/CommentThread";
import { CloseIcon, SendIcon } from "@/components/icons";

export default function CommentsSheet() {
  const postId = useUIStore((s) => s.commentsPostId);
  const close = useUIStore((s) => s.closeComments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);

  const { profile: me, userId } = useCurrentProfile();
  const { comments, mutate } = useComments(postId ?? undefined, userId);
  const { post, mutate: mutatePost } = usePost(postId ?? undefined, userId);

  if (!postId) return null;

  async function submit() {
    if (!draft.trim() || !postId || !userId) return;
    setPosting(true);
    const body = draft.trim();
    const parentId = replyTo?.id ?? null;
    setDraft("");
    setReplyTo(null);
    try {
      await addComment(postId, userId, body, parentId);
      mutate();
      mutatePost();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  }

  function handleClose() {
    setReplyTo(null);
    setDraft("");
    close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={handleClose}>
      <div
        className="w-full md:w-[480px] md:rounded-2xl bg-surface border border-line rounded-t-2xl h-[80vh] md:h-[70vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">
            {post ? post.comment_count : comments.length} comment{(post ? post.comment_count : comments.length) === 1 ? "" : "s"}
          </h2>
          <button onClick={handleClose} aria-label="Close comments">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-line">
          {comments.length === 0 && (
            <p className="text-muted text-sm text-center mt-10">Be the first to say something.</p>
          )}
          {comments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              onReply={(comment) => setReplyTo(comment)}
              onChanged={() => {
                mutate();
                mutatePost();
              }}
            />
          ))}
        </div>

        <div className="border-t border-line">
          {replyTo && (
            <div className="flex items-center justify-between px-4 pt-2.5 text-xs text-muted">
              <span>
                Replying to: <span className="text-text">{replyTo.body.length > 50 ? `${replyTo.body.slice(0, 50)}...` : replyTo.body}</span>
              </span>
              <button onClick={() => setReplyTo(null)} className="hover:text-text">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
            {me && <Avatar src={me.avatar_url} alt={me.display_name} size={32} />}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
              className="flex-1 bg-surface2 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted border border-line focus:border-muted"
              autoFocus={!!replyTo}
            />
            <button onClick={submit} disabled={!draft.trim() || posting} className="disabled:opacity-30" aria-label="Send comment">
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
