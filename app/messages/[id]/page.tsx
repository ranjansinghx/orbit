"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useMessages, useProfilesMap } from "@/lib/supabase/hooks";
import { sendMessage, markConversationRead } from "@/lib/supabase/actions";
import { uploadMedia } from "@/lib/supabase/upload";
import { createClient } from "@/lib/supabase/client";
import useSWR from "swr";
import Avatar from "@/components/Avatar";
import { CheckIcon, ImageIcon, SendIcon } from "@/components/icons";
import { dayLabel, clockTime } from "@/lib/format";
import clsx from "clsx";

function useConversation(conversationId: string) {
  const supabase = createClient();
  const { data } = useSWR(["conversation", conversationId], async () => {
    const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
    if (error) return null;
    return data;
  });
  return data;
}

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;

  const { userId: currentUserId } = useCurrentProfile();
  const conv = useConversation(conversationId);
  const { messages, mutate } = useMessages(conversationId);

  const otherId = conv ? (conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id) : undefined;
  const profiles = useProfilesMap(otherId ? [otherId] : []);
  const other = otherId ? profiles[otherId] : undefined;

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (currentUserId) markConversationRead(conversationId, currentUserId).catch(() => {});
  }, [conversationId, currentUserId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Presence-based typing indicator: each participant broadcasts { typing }
  // on the conversation's channel; we watch for the other person's state.
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const others = Object.entries(state).filter(([key]) => key !== currentUserId);
        setOtherTyping(others.some(([, metas]) => metas.some((m) => m.typing)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });
    presenceChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId]);

  function handleDraftChange(value: string) {
    setDraft(value);
    presenceChannelRef.current?.track({ typing: value.length > 0 });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      presenceChannelRef.current?.track({ typing: false });
    }, 2000);
  }

  const thread = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  );

  if (conv === null) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 text-muted">
        Conversation not found.{" "}
        <button className="underline" onClick={() => router.push("/messages")}>
          Back to messages
        </button>
      </div>
    );
  }
  if (!conv || !other || !currentUserId) return null;

  async function handleSend() {
    if (!draft.trim() || !currentUserId) return;
    const body = draft.trim();
    setDraft("");
    presenceChannelRef.current?.track({ typing: false });
    setSending(true);
    try {
      await sendMessage(conversationId, currentUserId, body);
      mutate();
    } finally {
      setSending(false);
    }
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setSending(true);
    try {
      const url = await uploadMedia(file, currentUserId);
      await sendMessage(conversationId, currentUserId, "", url);
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  let lastDay = "";

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen flex flex-col h-screen">
      <div className="sticky top-0 z-20 bg-ink/90 backdrop-blur-sm border-b border-line px-4 py-3 flex items-center gap-3">
        <Link href="/messages" className="text-muted text-xl leading-none px-1" aria-label="Back">
          ←
        </Link>
        <Link href={`/profile/${other.username}`}>
          <Avatar src={other.avatar_url} alt={other.display_name} size={38} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${other.username}`} className="font-semibold block truncate">
            {other.display_name}
          </Link>
          {otherTyping && <p className="text-xs text-text">typing...</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {thread.map((m, idx) => {
          const mine = m.sender_id === currentUserId;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const isLastMine = mine && (idx === thread.length - 1 || thread[idx + 1]?.sender_id !== currentUserId);
          return (
            <div key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-muted font-mono bg-surface2 px-2.5 py-1 rounded-full">{day}</span>
                </div>
              )}
              <div className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 mb-1",
                    mine ? "bg-text text-ink rounded-br-sm" : "bg-surface2 rounded-bl-sm"
                  )}
                >
                  {m.media_url && (
                    <img src={m.media_url} alt="attachment" className="rounded-lg mb-1.5 max-h-64 object-cover" />
                  )}
                  {m.body && <p className="text-[15px] leading-snug">{m.body}</p>}
                </div>
              </div>
              {isLastMine && (
                <div className="flex justify-end items-center gap-1 pr-1 mb-2">
                  <span className="text-[10px] text-muted font-mono">{clockTime(m.created_at)}</span>
                  <CheckIcon double read={!!m.read_at} />
                </div>
              )}
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-surface2 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-ink border-t border-line px-3 py-3 flex items-center gap-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAttach} />
        <button onClick={() => fileInputRef.current?.click()} aria-label="Attach image" className="p-2 shrink-0" disabled={sending}>
          <ImageIcon />
        </button>
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-surface2 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-muted border border-line focus:border-muted"
        />
        <button onClick={handleSend} disabled={!draft.trim() || sending} className="p-2 disabled:opacity-30 shrink-0" aria-label="Send">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
