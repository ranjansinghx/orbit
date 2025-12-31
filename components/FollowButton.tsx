"use client";

import { useState } from "react";
import clsx from "clsx";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useIsFollowing, useFollowCounts } from "@/lib/supabase/hooks";
import { toggleFollow } from "@/lib/supabase/actions";

export default function FollowButton({
  userId,
  variant = "solid",
  size = "md",
}: {
  userId: string;
  variant?: "solid" | "outline";
  size?: "sm" | "md";
}) {
  const { userId: currentUserId } = useCurrentProfile();
  const { isFollowing, mutate } = useIsFollowing(currentUserId, userId);
  const { mutate: mutateCounts } = useFollowCounts(userId);
  const [pending, setPending] = useState(false);

  if (!currentUserId || userId === currentUserId) return null;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (pending) return;
    setPending(true);
    // optimistic flip
    mutate(!isFollowing, { revalidate: false });
    try {
      await toggleFollow(userId);
      mutateCounts();
    } catch (err) {
      console.error(err);
      mutate(isFollowing, { revalidate: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "rounded-full font-semibold transition-colors shrink-0",
        size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm",
        isFollowing
          ? "border border-line text-paper bg-transparent hover:border-danger hover:text-danger"
          : variant === "solid"
          ? "bg-paper text-ink hover:opacity-90"
          : "border border-paper text-paper hover:bg-paper hover:text-ink"
      )}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
