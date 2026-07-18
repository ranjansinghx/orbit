"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import {
  useProfileByUsername,
  useUserPosts,
  useFollowCounts,
  useFollowStatus,
  usePendingFollowRequests,
  usePost,
} from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { startConversation } from "@/lib/supabase/actions";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import ProfilePostRow from "@/components/feed/ProfilePostRow";
import { GearIcon, BookmarkIcon, LockIcon, PinIcon } from "@/components/icons";
import { compactNumber } from "@/lib/format";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { userId: currentUserId } = useCurrentProfile();
  const { profile: user } = useProfileByUsername(params.username);
  const { posts: userPosts, mutate: mutatePosts } = useUserPosts(user?.id);
  const { counts } = useFollowCounts(user?.id);
  const { status: followStatus } = useFollowStatus(currentUserId, user?.id);
  const { requests: pendingRequests } = usePendingFollowRequests(user?.id === currentUserId ? currentUserId : null);
  const { post: pinnedPost } = usePost(user?.pinned_post_id ?? undefined, currentUserId);
  const openSettings = useUIStore((s) => s.openSettings);

  const [messaging, setMessaging] = useState(false);

  const sortedPosts = useMemo(
    () =>
      [...userPosts]
        .filter((p) => p.id !== user?.pinned_post_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [userPosts, user?.pinned_post_id]
  );

  if (!user) {
    return <div className="max-w-2xl mx-auto px-5 py-10 text-muted">Loading profile...</div>;
  }

  const isMe = user.id === currentUserId;

  async function handleMessage() {
    if (!user) return;
    setMessaging(true);
    try {
      const convId = await startConversation(user.id);
      router.push(`/messages/${convId}`);
    } finally {
      setMessaging(false);
    }
  }

  function patchPost(id: string, patch: any) {
    mutatePosts(
      (current: any) => current?.map((p: any) => (p.id === id ? { ...p, ...patch } : p)),
      { revalidate: false }
    );
  }

  function removePost(id: string) {
    mutatePosts((current: any) => current?.filter((p: any) => p.id !== id), { revalidate: false });
  }

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-start justify-between">
          <Avatar src={user.avatar_url} alt={user.display_name} size={84} />
          <div className="flex items-center gap-2">
            {isMe ? (
              <>
                <Link
                  href="/saved"
                  className="p-2 rounded-full border border-line hover:border-muted transition-colors"
                  aria-label="Saved posts"
                >
                  <BookmarkIcon size={18} />
                </Link>
                <button
                  onClick={openSettings}
                  className="p-2 rounded-full border border-line hover:border-muted transition-colors"
                  aria-label="Settings"
                >
                  <GearIcon />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleMessage}
                  disabled={messaging}
                  className="px-4 py-2 rounded-full border border-line text-sm font-medium hover:border-muted transition-colors disabled:opacity-50"
                >
                  Message
                </button>
                <FollowButton userId={user.id} />
              </>
            )}
          </div>
        </div>

        <h1 className="font-display italic text-2xl mt-4 flex items-center gap-2">
          {user.display_name}
          {user.is_private && <LockIcon size={16} className="text-muted" />}
        </h1>
        <p className="text-muted text-sm">@{user.username}</p>
        <p className="text-[15px] mt-3 leading-relaxed">{user.bio}</p>

        <div className="flex items-center gap-5 mt-4 text-sm">
          <span>
            <b>{compactNumber(userPosts.length)}</b> <span className="text-muted">Posts</span>
          </span>
          <span>
            <b>{compactNumber(counts.followers)}</b> <span className="text-muted">Followers</span>
          </span>
          <span>
            <b>{compactNumber(counts.following)}</b> <span className="text-muted">Following</span>
          </span>
        </div>

        {isMe && user.is_private && pendingRequests.length > 0 && (
          <button
            onClick={openSettings}
            className="mt-4 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-line bg-surface2 text-sm hover:border-muted transition-colors"
          >
            <span>
              <b>{pendingRequests.length}</b> follow request{pendingRequests.length === 1 ? "" : "s"} waiting
            </span>
            <span className="text-muted">Review →</span>
          </button>
        )}
      </div>

      {pinnedPost && (
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted px-4 pt-3 -mb-1">
            <PinIcon size={12} /> Pinned
          </p>
          <ProfilePostRow post={pinnedPost} onPatch={patchPost} onDeleted={() => removePost(pinnedPost.id)} />
        </div>
      )}

      {user.is_private && !isMe && followStatus !== "accepted" ? (
        <div className="flex flex-col items-center gap-2 py-16 px-6 text-center">
          <LockIcon size={28} className="text-muted" />
          <p className="font-medium">This account is private</p>
          <p className="text-muted text-sm">
            {followStatus === "pending" ? "Your follow request is pending." : "Follow this account to see their posts."}
          </p>
        </div>
      ) : sortedPosts.length === 0 ? (
        <p className="text-center text-muted py-16">No posts yet.</p>
      ) : (
        sortedPosts.map((p) => (
          <ProfilePostRow key={p.id} post={p} onPatch={patchPost} onDeleted={() => removePost(p.id)} />
        ))
      )}
    </div>
  );
}
