"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useProfileByUsername, useUserPosts, useFollowCounts } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { startConversation } from "@/lib/supabase/actions";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import ProfilePostRow from "@/components/feed/ProfilePostRow";
import { GearIcon, BookmarkIcon } from "@/components/icons";
import { compactNumber } from "@/lib/format";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { userId: currentUserId } = useCurrentProfile();
  const { profile: user } = useProfileByUsername(params.username);
  const { posts: userPosts, mutate: mutatePosts } = useUserPosts(user?.id);
  const { counts } = useFollowCounts(user?.id);
  const openSettings = useUIStore((s) => s.openSettings);

  const [messaging, setMessaging] = useState(false);

  const sortedPosts = useMemo(
    () => [...userPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [userPosts]
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
          <Avatar src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.display_name} size={84} />
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

        <h1 className="font-display italic text-2xl mt-4">{user.display_name}</h1>
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
      </div>

      {sortedPosts.length === 0 ? (
        <p className="text-center text-muted py-16">No posts yet.</p>
      ) : (
        sortedPosts.map((p) => (
          <ProfilePostRow key={p.id} post={p} onPatch={patchPost} onDeleted={() => removePost(p.id)} />
        ))
      )}
    </div>
  );
}
