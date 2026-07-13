"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { usePost } from "@/lib/supabase/hooks";
import { updatePostCaption } from "@/lib/supabase/actions";
import { CloseIcon } from "@/components/icons";

export default function EditPostModal() {
  const postId = useUIStore((s) => s.editingPostId);
  const close = useUIStore((s) => s.closeEdit);
  const showToast = useUIStore((s) => s.showToast);
  const { userId } = useCurrentProfile();
  const { post, mutate } = usePost(postId ?? undefined, userId);

  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) setCaption(post.caption);
  }, [post]);

  if (!postId || !post) return null;

  async function save() {
    if (!postId) return;
    setSaving(true);
    try {
      await updatePostCaption(postId, caption);
      mutate();
      showToast("Post updated");
      close();
    } catch (err) {
      console.error(err);
      showToast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[480px] md:rounded-2xl bg-surface border border-line rounded-t-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">Edit post</h2>
          <button onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 py-4">
          {post.type !== "text" && post.media_urls[0] && (
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {post.media_urls.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-surface2 shrink-0">
                  {post.type === "photo" ? (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={url} className="w-full h-full object-cover" muted />
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mb-2">
            {post.type === "text" ? "Text" : "Media can't be changed after posting — delete and repost for that. Caption only:"}
          </p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={post.type === "text" ? 5 : 3}
            maxLength={500}
            className="w-full bg-surface2 rounded-xl p-3 text-[15px] outline-none resize-none border border-line focus:border-muted"
          />
          <p className="text-xs text-muted font-mono mt-2">{caption.length}/500</p>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
