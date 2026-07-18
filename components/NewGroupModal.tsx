"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSearch } from "@/lib/supabase/hooks";
import { createGroupConversation } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import { CloseIcon, UsersIcon } from "@/components/icons";

export default function NewGroupModal() {
  const open = useUIStore((s) => s.newGroupOpen);
  const close = useUIStore((s) => s.closeNewGroup);
  const showToast = useUIStore((s) => s.showToast);
  const router = useRouter();
  const { userId } = useCurrentProfile();

  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Record<string, { id: string; username: string; display_name: string; avatar_url: string }>>({});
  const [creating, setCreating] = useState(false);

  const { people } = useSearch(query);
  const candidates = people.filter((p) => p.id !== userId);

  if (!open) return null;

  function toggle(p: { id: string; username: string; display_name: string; avatar_url: string }) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  }

  async function handleCreate() {
    const memberIds = Object.keys(selected);
    if (memberIds.length < 2) {
      showToast("Pick at least 2 people for a group");
      return;
    }
    setCreating(true);
    try {
      const convId = await createGroupConversation(title.trim() || null, memberIds);
      close();
      setSelected({});
      setTitle("");
      setQuery("");
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error(err);
      showToast("Couldn't create group — try again");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[480px] md:rounded-2xl bg-surface border border-line rounded-t-2xl h-[80vh] md:h-[70vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl flex items-center gap-2">
            <UsersIcon size={18} /> New group
          </h2>
          <button onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pt-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name (optional)"
            className="bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
          />
          {Object.keys(selected).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.values(selected).map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  className="flex items-center gap-1.5 bg-surface2 border border-line rounded-full pl-1.5 pr-2.5 py-1 text-xs"
                >
                  <Avatar src={p.avatar_url} alt={p.display_name} size={18} />
                  {p.display_name}
                  <span className="text-muted">×</span>
                </button>
              ))}
            </div>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people to add..."
            className="bg-surface2 border border-line rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {candidates.length === 0 && <p className="text-muted text-sm text-center mt-10">No people found.</p>}
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface2 transition-colors text-left"
            >
              <Avatar src={p.avatar_url} alt={p.display_name} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name}</p>
                <p className="text-xs text-muted truncate">@{p.username}</p>
              </div>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  selected[p.id] ? "bg-paper border-paper" : "border-line"
                }`}
              >
                {selected[p.id] && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
              </span>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleCreate}
            disabled={creating || Object.keys(selected).length < 2}
            className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}
