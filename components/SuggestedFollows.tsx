"use client";

import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSuggestedFollows } from "@/lib/supabase/hooks";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";

export default function SuggestedFollows() {
  const { userId } = useCurrentProfile();
  const { people } = useSuggestedFollows(userId, 6);

  if (people.length === 0) return null;

  return (
    <div className="border-b border-line px-5 py-4">
      <h2 className="text-xs uppercase tracking-wide text-muted font-mono mb-3">Suggested for you</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
        {people.map((p) => (
          <div
            key={p.id}
            className="shrink-0 w-32 flex flex-col items-center gap-2 border border-line rounded-xl px-3 py-4"
          >
            <Link href={`/profile/${p.username}`}>
              <Avatar src={p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`} alt={p.display_name} size={52} />
            </Link>
            <Link href={`/profile/${p.username}`} className="text-center min-w-0">
              <p className="text-sm font-semibold truncate w-full">{p.display_name}</p>
              <p className="text-xs text-muted truncate w-full">@{p.username}</p>
            </Link>
            <FollowButton userId={p.id} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
