"use client";

import Link from "next/link";
import { useUIStore } from "@/lib/store/useUIStore";
import { useLikers } from "@/lib/supabase/hooks";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { CloseIcon } from "@/components/icons";

export default function LikersSheet() {
  const postId = useUIStore((s) => s.likersPostId);
  const close = useUIStore((s) => s.closeLikers);
  const { likers } = useLikers(postId ?? undefined);

  if (!postId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[420px] md:rounded-2xl bg-surface border border-line rounded-t-2xl h-[70vh] md:h-[60vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">Liked by</h2>
          <button onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {likers.length === 0 && <p className="text-muted text-sm text-center mt-10">No likes yet.</p>}
          {likers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <Link href={`/profile/${u.username}`} onClick={close}>
                <Avatar src={u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.display_name} size={44} />
              </Link>
              <Link href={`/profile/${u.username}`} onClick={close} className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.display_name}</p>
                <p className="text-sm text-muted truncate">@{u.username}</p>
              </Link>
              <FollowButton userId={u.id} size="sm" variant="outline" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
