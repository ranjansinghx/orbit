"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useIsSaved, useIsBlocked, useIsMuted, useProfileById, useCollections, usePost } from "@/lib/supabase/hooks";
import { deletePost, toggleSave, toggleBlock, toggleMute, setPinnedPost, moveSavedPost, setPostAudience, setPostReplyPermission } from "@/lib/supabase/actions";
import { useUIStore } from "@/lib/store/useUIStore";
import {
  MoreIcon,
  TrashIcon,
  BookmarkIcon,
  BlockIcon,
  EditIcon,
  FlagIcon,
  MuteIcon,
  PinIcon,
  QuoteIcon,
  FolderIcon,
  ChartIcon,
  GlobeIcon,
  UsersIcon,
  HeartIcon,
} from "@/components/icons";

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
  const openInsights = useUIStore((s) => s.openInsights);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { isSaved, mutate: mutateSaved } = useIsSaved(userId, postId);
  const { isBlocked, mutate: mutateBlocked } = useIsBlocked(userId, authorId);
  const { isMuted, mutate: mutateMuted } = useIsMuted(userId, authorId);
  const author = useProfileById(authorId);
  const { collections } = useCollections(isSaved ? userId : null);
  const [showCollections, setShowCollections] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [showReplyPerm, setShowReplyPerm] = useState(false);

  const isOwner = userId === authorId;
  const isPinned = author?.pinned_post_id === postId;
  const { post: ownPost, mutate: mutatePost } = usePost(isOwner ? postId : undefined, userId);

  async function handleSetAudience(value: "everyone" | "followers" | "close_friends") {
    setShowAudience(false);
    setOpen(false);
    try {
      await setPostAudience(postId, value);
      mutatePost();
      showToast("Audience updated");
    } catch (err) {
      console.error(err);
      showToast("Couldn't update — try again");
    }
  }

  async function handleSetReplyPermission(value: "everyone" | "followers" | "mentioned") {
    setShowReplyPerm(false);
    setOpen(false);
    try {
      await setPostReplyPermission(postId, value);
      mutatePost();
      showToast("Reply setting updated");
    } catch (err) {
      console.error(err);
      showToast("Couldn't update — try again");
    }
  }

  async function handleMoveToCollection(collectionId: string | null) {
    setShowCollections(false);
    setOpen(false);
    try {
      await moveSavedPost(postId, collectionId);
      showToast(collectionId ? "Moved to collection" : "Removed from collection");
    } catch (err) {
      console.error(err);
      showToast("Couldn't move — try again");
    }
  }

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

  return (
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
          {isSaved && collections.length > 0 && (
            <div className="border-t border-line">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCollections((v) => !v);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <FolderIcon size={16} />
                Move to collection
              </button>
              {showCollections && (
                <div className="pb-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveToCollection(null);
                    }}
                    className="w-full flex items-center gap-2.5 pl-9 pr-4 py-2 text-xs text-left text-muted hover:bg-surface2 transition-colors"
                  >
                    Uncategorized
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveToCollection(c.id);
                      }}
                      className="w-full flex items-center gap-2.5 pl-9 pr-4 py-2 text-xs text-left text-muted hover:bg-surface2 transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {isOwner ? (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  openInsights(postId);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
              >
                <ChartIcon size={16} />
                View insights
              </button>
              <div className="border-t border-line">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAudience((v) => !v);
                    setShowReplyPerm(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
                >
                  <GlobeIcon size={16} />
                  Who can see this
                  {ownPost && <span className="ml-auto text-xs text-muted capitalize">{ownPost.audience?.replace("_", " ")}</span>}
                </button>
                {showAudience && (
                  <div className="pb-1">
                    {(["everyone", "followers", "close_friends"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSetAudience(v);
                        }}
                        className="w-full flex items-center gap-2.5 pl-9 pr-4 py-2 text-xs text-left text-muted hover:bg-surface2 transition-colors capitalize"
                      >
                        {v === "everyone" && <GlobeIcon size={12} />}
                        {v === "followers" && <UsersIcon size={13} />}
                        {v === "close_friends" && <HeartIcon size={12} />}
                        {v.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-line">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowReplyPerm((v) => !v);
                    setShowAudience(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-surface2 transition-colors"
                >
                  <UsersIcon size={16} />
                  Who can reply
                  {ownPost && <span className="ml-auto text-xs text-muted capitalize">{ownPost.reply_permission}</span>}
                </button>
                {showReplyPerm && (
                  <div className="pb-1">
                    {(["everyone", "followers", "mentioned"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSetReplyPermission(v);
                        }}
                        className="w-full flex items-center gap-2.5 pl-9 pr-4 py-2 text-xs text-left text-muted hover:bg-surface2 transition-colors capitalize"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
