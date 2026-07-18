"use client";

import { useState } from "react";
import clsx from "clsx";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useFollowStatus, useFollowCounts } from "@/lib/supabase/hooks";
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
  const { status, mutate } = useFollowStatus(currentUserId, userId);
  const { mutate: mutateCounts } = useFollowCounts(userId);
  const [pending, setPending] = useState(false);
  const [hovering, setHovering] = useState(false);

  if (!currentUserId || userId === currentUserId) return null;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const prevStatus = status;
    // optimistic flip — a fresh click always either removes the relationship
    // (accepted or pending) or creates one; we don't know ahead of time
    // whether a new request lands as pending or accepted, so we only
    // optimistically clear, and let the mutation settle the real state.
    if (prevStatus !== "none") mutate("none", { revalidate: false });
    try {
      await toggleFollow(userId);
      mutate();
      mutateCounts();
    } catch (err) {
      console.error(err);
      mutate(prevStatus, { revalidate: false });
    } finally {
      setPending(false);
    }
  }

  const label =
    status === "accepted"
      ? hovering
        ? "Unfollow"
        : "Following"
      : status === "pending"
      ? hovering
        ? "Cancel"
        : "Requested"
      : "Follow";

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        "rounded-full font-semibold transition-colors shrink-0",
        size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm",
        status !== "none"
          ? "border border-line text-paper bg-transparent hover:border-danger hover:text-danger"
          : variant === "solid"
          ? "bg-paper text-ink hover:opacity-90"
          : "border border-paper text-paper hover:bg-paper hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
