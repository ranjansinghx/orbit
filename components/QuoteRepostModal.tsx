"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { usePost } from "@/lib/supabase/hooks";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { toggleRepost } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import HashtagText from "@/components/HashtagText";
import { CloseIcon } from "@/components/icons";
import { timeAgo } from "@/lib/format";

export default function QuoteRepostModal() {
  const postId = useUIStore((s) => s.quoteRepostPostId);
  const close = useUIStore((s) => s.closeQuoteRepost);
  const showToast = useUIStore((s) => s.showToast);
  const { profile: me, userId } = useCurrentProfile();
  const { post } = usePost(postId ?? undefined, userId);
  const [quote, setQuote] = useState("");
  const [posting, setPosting] = useState(false);

  if (!postId) return null;

  async function submit() {
    if (!postId) return;
    setPosting(true);
    try {
      await toggleRepost(postId, quote.trim() || undefined);
      showToast("Reposted to your Following feed");
      setQuote("");
      close();
    } catch (err) {
      console.error(err);
      showToast("Couldn't repost — try again");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[480px] md:rounded-2xl bg-surface border border-line rounded-t-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">Quote repost</h2>
          <button onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {me && <Avatar src={me.avatar_url} alt={me.display_name} size={38} />}
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Add a comment (optional)..."
              rows={3}
              maxLength={280}
              className="flex-1 bg-transparent outline-none resize-none text-[15px] placeholder:text-muted"
              autoFocus
            />
          </div>

          {post && (
            <div className="border border-line rounded-xl p-3 flex gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted">
                  <span className="text-paper font-semibold">Original post</span> · {timeAgo(post.created_at)}
                </p>
                <HashtagText text={post.caption} className="text-sm mt-1 block" />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={submit}
            disabled={posting}
            className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {posting ? "Reposting..." : "Repost"}
          </button>
        </div>
      </div>
    </div>
  );
}
