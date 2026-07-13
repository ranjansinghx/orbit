"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSearch, useBlockedIds } from "@/lib/supabase/hooks";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { SearchIcon } from "@/components/icons";
import { compactNumber } from "@/lib/format";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { userId: currentUserId } = useCurrentProfile();
  const { hashtags, people } = useSearch(query.trim().toLowerCase());
  const blockedIds = useBlockedIds(currentUserId);

  const filteredPeople = people.filter((p) => p.id !== currentUserId && !blockedIds.has(p.id));

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Search" />
      <div className="px-5 py-4 sticky top-[73px] bg-ink z-10 border-b border-line">
        <div className="flex items-center gap-2 bg-surface2 rounded-full px-4 py-2.5 border border-line">
          <SearchIcon size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people and hashtags"
            className="bg-transparent outline-none flex-1 text-[15px] placeholder:text-muted"
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <h2 className="text-xs uppercase tracking-wide text-muted font-mono mb-3">
          {query ? "Hashtags" : "Trending hashtags"}
        </h2>
        <div className="flex flex-wrap gap-2 mb-8">
          {hashtags.length === 0 && <p className="text-sm text-muted">No hashtags found.</p>}
          {hashtags.map((h) => (
            <Link
              key={h.tag}
              href={`/hashtag/${h.tag}`}
              className="bg-surface2 border border-line rounded-full px-4 py-2 text-sm hover:border-text transition-colors"
            >
              <span className="text-text">#{h.tag}</span>{" "}
              <span className="text-muted font-mono text-xs">{compactNumber(h.post_count)}</span>
            </Link>
          ))}
        </div>

        <h2 className="text-xs uppercase tracking-wide text-muted font-mono mb-3">
          {query ? "People" : "Suggested people"}
        </h2>
        <div className="flex flex-col divide-y divide-line">
          {filteredPeople.length === 0 && <p className="text-sm text-muted">No people found.</p>}
          {filteredPeople.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <Link href={`/profile/${u.username}`}>
                <Avatar src={u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`} alt={u.display_name} size={44} />
              </Link>
              <Link href={`/profile/${u.username}`} className="flex-1 min-w-0">
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
