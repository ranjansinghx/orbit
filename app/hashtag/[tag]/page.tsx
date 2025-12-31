"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useHashtagPosts } from "@/lib/supabase/hooks";
import { sortForYou } from "@/lib/supabase/rank";
import TextPostCard from "@/components/feed/TextPostCard";
import PageHeader from "@/components/PageHeader";
import { compactNumber } from "@/lib/format";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

function useFollowingSet(userId: string | null | undefined) {
  const supabase = createClient();
  const { data } = useSWR(userId ? ["following-set", userId] : null, async () => {
    const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", userId!);
    return new Set((data ?? []).map((f) => f.followee_id));
  });
  return data ?? new Set<string>();
}

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const tag = params.tag.toLowerCase();
  const { userId } = useCurrentProfile();
  const { posts: tagged } = useHashtagPosts(tag);
  const followingSet = useFollowingSet(userId);

  const [tab, setTab] = useState<"media" | "text">("media");

  const mediaPosts = useMemo(() => sortForYou(tagged, followingSet), [tagged, followingSet]);
  const textPosts = useMemo(
    () =>
      tagged
        .filter((p) => p.type === "text")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [tagged]
  );

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title={`#${tag}`} subtitle={`${compactNumber(tagged.length)} posts`} />

      <div className="flex border-b border-line sticky top-[73px] bg-ink/90 backdrop-blur-sm z-10">
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
          <p className="text-center text-muted py-16">No video or photo posts with this tag.</p>
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
        <p className="text-center text-muted py-16">No text posts with this tag.</p>
      ) : (
        textPosts.map((p) => <TextPostCard key={p.id} post={p} />)
      )}
    </div>
  );
}
