"use client";

import { useRef, useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { createPost } from "@/lib/supabase/actions";
import { uploadMedia } from "@/lib/supabase/upload";
import { PostType } from "@/lib/supabase/database.types";
import { CloseIcon, ImageIcon, VideoIcon, TextIcon } from "@/components/icons";
import clsx from "clsx";

const MAX_PHOTOS = 10;

export default function Composer() {
  const open = useUIStore((s) => s.composerOpen);
  const close = useUIStore((s) => s.closeComposer);
  const showToast = useUIStore((s) => s.showToast);
  const { userId } = useCurrentProfile();

  const [type, setType] = useState<PostType>("text");
  const [caption, setCaption] = useState("");
  // photo posts can carry multiple files (carousel); video posts are single-file
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const needsMedia = type !== "text";
  const canPost = userId && !uploading && (type === "text" ? caption.trim().length > 0 : files.length > 0);

  function reset() {
    setType("text");
    setCaption("");
    setFiles([]);
    setPreviewUrls([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    if (type === "video") {
      const f = picked[0];
      setFiles([f]);
      setPreviewUrls([URL.createObjectURL(f)]);
      return;
    }

    // photo: append, cap at MAX_PHOTOS
    setFiles((prev) => {
      const combined = [...prev, ...picked].slice(0, MAX_PHOTOS);
      setPreviewUrls(combined.map((f) => URL.createObjectURL(f)));
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePost() {
    if (!userId) return;
    setUploading(true);
    try {
      let mediaUrls: string[] = [];
      if (needsMedia && files.length > 0) {
        mediaUrls = await Promise.all(files.map((f) => uploadMedia(f, userId)));
      }
      await createPost({ authorId: userId, type, caption, mediaUrls });
      showToast(type === "text" ? "Posted to Following" : "Posted to For You");
      reset();
      close();
    } catch (err) {
      console.error(err);
      showToast("Couldn't post — try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[520px] md:rounded-2xl bg-surface border border-line rounded-t-2xl max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface z-10">
          <h2 className="font-display italic text-xl">New post</h2>
          <button onClick={close} aria-label="Close composer" className="p-1">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-2 mb-4">
            {(["text", "photo", "video"] as PostType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setFiles([]);
                  setPreviewUrls([]);
                }}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium border transition-colors capitalize",
                  type === t
                    ? t === "text"
                      ? "bg-text/15 border-text text-text"
                      : "bg-video/15 border-video text-video"
                    : "border-line text-muted"
                )}
              >
                {t === "text" && <TextIcon size={16} active={type === t} />}
                {t === "photo" && <ImageIcon size={16} />}
                {t === "video" && <VideoIcon size={16} />}
                {t}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted font-mono mb-3">
            {type === "text"
              ? "Goes to the Following feed"
              : type === "photo"
              ? "Goes to the For You feed — add multiple photos for a swipeable carousel"
              : "Goes to the For You feed"}
          </p>

          {needsMedia && (
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={type === "photo" ? "image/*" : "video/*"}
                multiple={type === "photo"}
                className="hidden"
                onChange={handleFileChange}
              />

              {type === "photo" && previewUrls.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {previewUrls.map((url, i) => (
                    <div key={url} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-line">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <CloseIcon size={12} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/70 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                  {previewUrls.length < MAX_PHOTOS && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[9/16] rounded-lg border border-dashed border-line flex items-center justify-center text-muted hover:border-muted transition-colors"
                      aria-label="Add another photo"
                    >
                      <ImageIcon size={22} />
                    </button>
                  )}
                </div>
              ) : type === "video" && previewUrls[0] ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg overflow-hidden border border-line aspect-video bg-black relative"
                >
                  <video src={previewUrls[0]} className="w-full h-full object-cover" muted />
                  <span className="absolute bottom-2 right-2 bg-black/60 text-xs font-mono px-2 py-1 rounded-full">
                    Change
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-line aspect-video flex flex-col items-center justify-center gap-2 text-muted hover:border-muted transition-colors"
                >
                  {type === "photo" ? <ImageIcon size={28} /> : <VideoIcon size={28} />}
                  <span className="text-sm">
                    {type === "photo" ? "Choose one or more photos" : "Choose a video"}
                  </span>
                </button>
              )}
            </div>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={
              type === "text"
                ? "What's on your mind? Use #hashtags to tag it."
                : "Write a caption... #hashtags work here too"
            }
            rows={type === "text" ? 5 : 3}
            className="w-full bg-surface2 rounded-xl p-3 text-[15px] placeholder:text-muted outline-none resize-none mb-4 border border-line focus:border-muted"
            maxLength={500}
          />
        </div>

        <div className="px-5 pb-5 flex items-center justify-between">
          <span className="text-xs text-muted font-mono">{caption.length}/500</span>
          <button
            onClick={handlePost}
            disabled={!canPost}
            className="bg-paper text-ink font-semibold rounded-full px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {uploading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
