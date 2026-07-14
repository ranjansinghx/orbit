"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useComments, useProfilesMap } from "@/lib/supabase/hooks";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { addComment, deleteComment } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import HashtagText from "@/components/HashtagText";
import { CloseIcon, SendIcon, TrashIcon } from "@/components/icons";
import { timeAgo } from "@/lib/format";

export default function CommentsSheet() {
  const postId = useUIStore((s) => s.commentsPostId);
  const close = useUIStore((s) => s.closeComments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const { comments, mutate } = useComments(postId ?? undefined);
  const authorIds = comments.map((c) => c.author_id);
  const authors = useProfilesMap(authorIds);
  const { profile: me, userId } = useCurrentProfile();

  if (!postId) return null;

  async function submit() {
    if (!draft.trim() || !postId || !userId) return;
    setPosting(true);
    const body = draft.trim();
    setDraft("");
    try {
      await addComment(postId, userId, body);
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[480px] md:rounded-2xl bg-surface border border-line rounded-t-2xl h-[80vh] md:h-[70vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">
            {comments.length} comment{comments.length === 1 ? "" : "s"}
          </h2>
          <button onClick={close} aria-label="Close comments">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {comments.length === 0 && (
            <p className="text-muted text-sm text-center mt-10">Be the first to say something.</p>
          )}
          {comments.map((c) => {
            const author = authors[c.author_id];
            if (!author) return null;
            return (
              <div key={c.id} className="flex gap-3 py-3">
                <Avatar src={author.avatar_url || "https://i.pravatar.cc/150?u=" + author.id} alt={author.display_name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold mr-1.5">{author.username}</span>
                    <HashtagText text={c.body} className="text-paper/90" />
                  </p>
                  <p className="text-[11px] text-muted font-mono mt-0.5">{timeAgo(c.created_at)}</p>
                </div>
                {c.author_id === userId && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this comment?")) return;
                      try {
                        await deleteComment(c.id);
                        mutate();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="p-1 text-muted hover:text-danger transition-colors shrink-0 self-start"
                    aria-label="Delete comment"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-line">
          {me && <Avatar src={me.avatar_url || "https://i.pravatar.cc/150?u=" + me.id} alt={me.display_name} size={32} />}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment..."
            className="flex-1 bg-surface2 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted border border-line focus:border-muted"
          />
          <button onClick={submit} disabled={!draft.trim() || posting} className="disabled:opacity-30" aria-label="Send comment">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
