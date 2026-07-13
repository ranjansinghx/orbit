"use client";

import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSavedFeed } from "@/lib/supabase/hooks";
import TextPostCard from "@/components/feed/TextPostCard";
import ProfilePostRow from "@/components/feed/ProfilePostRow";
import PageHeader from "@/components/PageHeader";

export default function SavedPage() {
  const { userId } = useCurrentProfile();
  const { posts, mutate } = useSavedFeed(userId);

  function patchPost(id: string, patch: any) {
    mutate((current: any) => current?.map((p: any) => (p.id === id ? { ...p, ...patch } : p)), {
      revalidate: false,
    });
  }

  function removePost(id: string) {
    mutate((current: any) => current?.filter((p: any) => p.id !== id), { revalidate: false });
  }

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Saved" subtitle="Posts you've bookmarked" />
      {posts.length === 0 ? (
        <div className="px-6 py-16 text-center text-muted">
          <p className="mb-1">Nothing saved yet.</p>
          <p className="text-sm">Use the ⋯ menu on any post to save it here.</p>
        </div>
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
