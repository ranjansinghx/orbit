"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useProfileByUsername, useUserPosts, useFollowCounts } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import { startConversation } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import TextPostCard from "@/components/feed/TextPostCard";
import { GearIcon } from "@/components/icons";
import { compactNumber } from "@/lib/format";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { userId: currentUserId } = useCurrentProfile();
  const { profile: user } = useProfileByUsername(params.username);
  const { posts: userPosts, mutate: mutatePosts } = useUserPosts(user?.id);
  const { counts } = useFollowCounts(user?.id);
  const openSettings = useUIStore((s) => s.openSettings);

  const [tab, setTab] = useState<"media" | "text">("media");
  const [messaging, setMessaging] = useState(false);

  if (!user) {
    return <div className="max-w-2xl mx-auto px-5 py-10 text-muted">Loading profile...</div>;
  }

  const isMe = user.id === currentUserId;
  const mediaPosts = userPosts.filter((p) => p.type !== "text");
  const textPosts = userPosts.filter((p) => p.type === "text");

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

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-start justify-between">
          <Avatar src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.display_name} size={84} />
          <div className="flex items-center gap-2">
            {isMe ? (
              <button
                onClick={openSettings}
                className="p-2 rounded-full border border-line hover:border-muted transition-colors"
                aria-label="Settings"
              >
                <GearIcon />
              </button>
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

      <div className="flex border-b border-line sticky top-0 bg-ink/90 backdrop-blur-sm z-10">
        {(["media", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-paper text-paper" : "border-transparent text-muted"
            }`}
          >
            {t === "media" ? `For You (${mediaPosts.length})` : `Following (${textPosts.length})`}
          </button>
        ))}
      </div>

      {tab === "media" ? (
        mediaPosts.length === 0 ? (
          <p className="text-center text-muted py-16">No video or photo posts yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {mediaPosts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`} className="relative aspect-[9/16] bg-surface2 block overflow-hidden">
                {p.type === "photo" ? (
                  <img src={p.media_urls[0]} alt={p.caption} className="w-full h-full object-cover" />
                ) : (
                  <video src={p.media_urls[0]} className="w-full h-full object-cover" muted />
                )}
                <span className="absolute bottom-1.5 left-1.5 text-[11px] font-mono bg-black/50 rounded px-1.5 py-0.5">
                  {compactNumber(p.like_count)}♥
                </span>
              </Link>
            ))}
          </div>
        )
      ) : textPosts.length === 0 ? (
        <p className="text-center text-muted py-16">No text posts yet.</p>
      ) : (
        textPosts.map((p) => <TextPostCard key={p.id} post={p} onPatch={(id, patch) => mutatePosts()} />)
      )}
    </div>
  );
}
