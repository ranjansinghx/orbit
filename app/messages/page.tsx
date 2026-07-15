"use client";

import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useConversations, useProfilesMap } from "@/lib/supabase/hooks";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/format";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

function useLastMessages(conversationIds: string[], myId: string | null | undefined) {
  const supabase = createClient();
  const key = conversationIds.length && myId ? ["last-messages", conversationIds.sort().join(","), myId] : null;
  const { data } = useSWR(key, async () => {
    const results = await Promise.all(
      conversationIds.map(async (id) => {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", id)
          .neq("sender_id", myId!)
          .is("read_at", null);
        return [id, { last: data, unread: count ?? 0 }] as const;
      })
    );
    return Object.fromEntries(results);
  });
  return data ?? {};
}

export default function MessagesPage() {
  const { userId } = useCurrentProfile();
  const { conversations } = useConversations(userId);
  const otherIds = conversations.map((c) => (c.user_a_id === userId ? c.user_b_id : c.user_a_id));
  const profiles = useProfilesMap(otherIds);
  const lastMessages = useLastMessages(conversations.map((c) => c.id), userId);

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Messages" />
      {conversations.length === 0 && <p className="text-center text-muted py-16">No conversations yet.</p>}
      {conversations.map((c) => {
        const otherId = c.user_a_id === userId ? c.user_b_id : c.user_a_id;
        const other = profiles[otherId];
        const info = lastMessages[c.id];
        if (!other || !info?.last) return null;
        const { last, unread } = info;
        return (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="flex items-center gap-3 px-5 py-4 border-b border-line hover:bg-surface/40 transition-colors"
          >
            <Avatar src={other.avatar_url} alt={other.display_name} size={50} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{other.display_name}</p>
                <span className="text-[11px] text-muted font-mono shrink-0 ml-2">{timeAgo(last.created_at)}</span>
              </div>
              <p className={`text-sm truncate ${unread > 0 ? "text-paper font-medium" : "text-muted"}`}>
                {last.sender_id === userId ? "You: " : ""}
                {last.body ?? "📷 Photo"}
              </p>
            </div>
            {unread > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-video text-[11px] font-mono flex items-center justify-center shrink-0">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
