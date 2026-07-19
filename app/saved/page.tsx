"use client";

import { useState } from "react";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSavedFeed, useCollections } from "@/lib/supabase/hooks";
import { createCollection } from "@/lib/supabase/actions";
import TextPostCard from "@/components/feed/TextPostCard";
import ProfilePostRow from "@/components/feed/ProfilePostRow";
import PageHeader from "@/components/PageHeader";
import { PlusIcon } from "@/components/icons";
import EmptyState from "@/components/EmptyState";

export default function SavedPage() {
  const { userId } = useCurrentProfile();
  const { collections, mutate: mutateCollections } = useCollections(userId);
  const [activeCollection, setActiveCollection] = useState<string | "all">("all");
  const { posts, mutate } = useSavedFeed(userId, activeCollection === "all" ? undefined : activeCollection);
  const [creating, setCreating] = useState(false);

  function patchPost(id: string, patch: any) {
    mutate((current: any) => current?.map((p: any) => (p.id === id ? { ...p, ...patch } : p)), {
      revalidate: false,
    });
  }

  function removePost(id: string) {
    mutate((current: any) => current?.filter((p: any) => p.id !== id), { revalidate: false });
  }

  async function handleNewCollection() {
    const name = window.prompt("Collection name")?.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createCollection(name);
      mutateCollections();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Saved" subtitle="Posts you've bookmarked" />

      <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-line">
        <button
          onClick={() => setActiveCollection("all")}
          className={`px-3.5 py-1.5 rounded-full text-sm shrink-0 transition-colors ${
            activeCollection === "all" ? "bg-paper text-ink font-medium" : "border border-line text-muted"
          }`}
        >
          All
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCollection(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm shrink-0 transition-colors ${
              activeCollection === c.id ? "bg-paper text-ink font-medium" : "border border-line text-muted"
            }`}
          >
            {c.name} {c.post_count > 0 && <span className="opacity-60">({c.post_count})</span>}
          </button>
        ))}
        <button
          onClick={handleNewCollection}
          disabled={creating}
          className="px-3 py-1.5 rounded-full text-sm shrink-0 border border-dashed border-line text-muted hover:border-muted transition-colors flex items-center gap-1"
        >
          <PlusIcon size={13} /> New
        </button>
      </div>

      {posts.length === 0 ? (
        <EmptyState title="Nothing saved here yet" body="Use the ⋯ menu on any post to save it." />
      ) : (
        posts.map((p) =>
          p.type === "text" ? (
            <TextPostCard
              key={p.id}
              post={p}
              onPatch={patchPost}
              onDeleted={() => removePost(p.id)}
              onUnsaved={() => removePost(p.id)}
            />
          ) : (
            <ProfilePostRow
              key={p.id}
              post={p}
              onPatch={patchPost}
              onDeleted={() => removePost(p.id)}
              onUnsaved={() => removePost(p.id)}
            />
          )
        )
      )}
    </div>
  );
}
