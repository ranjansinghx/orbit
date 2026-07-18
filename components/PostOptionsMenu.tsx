"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useIsSaved, useIsBlocked, useIsMuted, useProfileById } from "@/lib/supabase/hooks";
import { deletePost, toggleSave, toggleBlock, toggleMute, setPinnedPost } from "@/lib/supabase/actions";
import { useUIStore } from "@/lib/store/useUIStore";
import { MoreIcon, TrashIcon, BookmarkIcon, BlockIcon, EditIcon, FlagIcon, MuteIcon, PinIcon, QuoteIcon } from "@/components/icons";

export default function PostOptionsMenu({
  postId,
  authorId,
  onDeleted,
  onUnsaved,
}: {
  postId: string;
  authorId: string;
  onDeleted?: () => void;
  onUnsaved?: () => void;
}) {
  const { userId } = useCurrentProfile();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const openEdit = useUIStore((s) => s.openEdit);
  const openReport = useUIStore((s) => s.openReport);
  const openQuoteRepost = useUIStore((s) => s.openQuoteRepost);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { isSaved, mutate: mutateSaved } = useIsSaved(userId, postId);
  const { isBlocked, mutate: mutateBlocked } = useIsBlocked(userId, authorId);
  const { isMuted, mutate: mutateMuted } = useIsMuted(userId, authorId);
  const author = useProfileById(authorId);

  const isOwner = userId === authorId;
  const isPinned = author?.pinned_post_id === postId;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    mutateSaved(!isSaved, { revalidate: false });
    try {
      await toggleSave(postId);
      showToast(isSaved ? "Removed from saved" : "Saved");
      if (isSaved && onUnsaved) onUnsaved();
    } catch (err) {
      console.error(err);
      mutateSaved(isSaved, { revalidate: false });
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost(postId);
      showToast("Post deleted");
      if (onDeleted) onDeleted();
      else router.push("/");
    } catch (err) {
      console.error(err);
      showToast("Couldn't delete — try again");
    }
  }

  async function handleBlock(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (!isBlocked && !window.confirm("Block this account? You'll stop following each other and won't be able to message.")) return;
    mutateBlocked(!isBlocked, { revalidate: false });
    try {
      await toggleBlock(authorId);
      showToast(isBlocked ? "Unblocked" : "Blocked");
    } catch (err) {
      console.error(err);
      mutateBlocked(isBlocked, { revalidate: false });
    }
  }

  async function handleMute(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    mutateMuted(!isMuted, { revalidate: false });
    try {
      await toggleMute(authorId);
      showToast(isMuted ? "Unmuted" : "Muted — you won't see their posts, they won't be notified");
    } catch (err) {
      console.error(err);
      mutateMuted(isMuted, { revalidate: false });
    }
  }

  async function handlePin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    try {
      await setPinnedPost(isPinned ? null : postId);
      globalMutate(["profile-by-id", authorId]);
      showToast(isPinned ? "Unpinned from your profile" : "Pinned to your profile");
    } catch (err) {
      console.error(err);
      showToast("Couldn't update pin — try again");
    }
  }

    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 text-muted hover:text-paper transition-colors"
        aria-label="Post options"
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-52 bg-surface border border-line rounded-xl overflow-hidden shadow-xl animate-fade-in">
          <button
            onClick={handleSave}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
          >
            <BookmarkIcon filled={isSaved} size={16} />
            {isSaved ? "Remove from saved" : "Save post"}
          </button>
          {isOwner ? (
            <>
              <button
                onClick={handlePin}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <PinIcon size={16} filled={isPinned} />
                {isPinned ? "Unpin from profile" : "Pin to profile"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  openEdit(postId);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <EditIcon size={16} />
                Edit post
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left text-danger hover:bg-surface2 transition-colors"
              >
                <TrashIcon size={16} />
                Delete post
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  openQuoteRepost(postId);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <QuoteIcon size={16} />
                Quote repost
              </button>
              <button
                onClick={handleMute}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <MuteIcon size={16} />
                {isMuted ? "Unmute account" : "Mute account"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  openReport({ type: "post", id: postId });
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <FlagIcon size={16} />
                Report post
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  openReport({ type: "user", id: authorId });
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <FlagIcon size={16} />
                Report account
              </button>
              <button
                onClick={handleBlock}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left text-danger hover:bg-surface2 transition-colors"
              >
                <BlockIcon size={16} />
                {isBlocked ? "Unblock account" : "Block account"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
