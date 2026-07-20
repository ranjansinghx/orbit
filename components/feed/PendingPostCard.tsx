"use client";

import Avatar from "@/components/Avatar";
import OrbitMark from "@/components/OrbitMark";
import HashtagText from "@/components/HashtagText";
import { PendingPost, usePendingPostsStore } from "@/lib/store/usePendingPostsStore";

/** Renders a just-submitted post while it's still uploading/saving —
 * shown at the top of the relevant feed the instant Composer submits,
 * before the server has confirmed anything. */
export default function PendingPostCard({ post, variant }: { post: PendingPost; variant: "snap" | "row" }) {
  const removePendingPost = usePendingPostsStore((s) => s.removePendingPost);

  if (variant === "snap") {
    return (
      <div className="relative h-[100dvh] w-full snap-start bg-ink overflow-hidden">
        {post.previewUrls[0] &&
          (post.type === "video" ? (
            <video src={post.previewUrls[0]} className="absolute inset-0 w-full h-full object-cover opacity-60" muted />
          ) : (
            <img src={post.previewUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          ))}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
          <OrbitMark size={32} spin />
          <p className="text-sm font-medium">{post.status === "error" ? "Couldn't post" : "Posting..."}</p>
          {post.status === "error" && (
            <button onClick={() => removePendingPost(post.id)} className="text-xs text-muted underline">
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-line opacity-70">
      <Avatar src={post.authorAvatarUrl} alt={post.authorDisplayName} size={42} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[15px]">
          <span className="font-semibold truncate">{post.authorDisplayName}</span>
          <span className="text-muted truncate">@{post.authorUsername}</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted shrink-0">
            <OrbitMark size={13} spin={post.status === "uploading"} />
            {post.status === "error" ? "Failed" : "Posting..."}
          </span>
        </div>
        <HashtagText text={post.caption} className="text-[15px] leading-relaxed block mt-0.5" />
        {post.status === "error" && (
          <button onClick={() => removePendingPost(post.id)} className="text-xs text-danger underline mt-1">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
