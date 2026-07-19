"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useDrafts } from "@/lib/supabase/hooks";
import { createPost, saveDraft, deleteDraft, createPoll } from "@/lib/supabase/actions";
import { uploadMedia } from "@/lib/supabase/upload";
import { PostType, PostAudience, ReplyPermission } from "@/lib/supabase/database.types";
import { CloseIcon, ImageIcon, VideoIcon, TextIcon, TrashIcon, GlobeIcon, UsersIcon, HeartIcon, PlusIcon, ChartIcon } from "@/components/icons";
import MentionHashtagTextarea from "@/components/MentionHashtagTextarea";
import { timeAgo } from "@/lib/format";
import clsx from "clsx";

const MAX_PHOTOS = 10;
const MAX_POLL_OPTIONS = 4;

const AUDIENCE_OPTIONS: { value: PostAudience; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "close_friends", label: "Close friends" },
];
const REPLY_OPTIONS: { value: ReplyPermission; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "mentioned", label: "Mentioned only" },
];

export default function Composer() {
  const open = useUIStore((s) => s.composerOpen);
  const close = useUIStore((s) => s.closeComposer);
  const showToast = useUIStore((s) => s.showToast);
  const { userId } = useCurrentProfile();
  const { drafts, mutate: mutateDrafts } = useDrafts(userId);

  const [view, setView] = useState<"compose" | "drafts">("compose");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [type, setType] = useState<PostType>("text");
  const [caption, setCaption] = useState("");
  // photo posts can carry multiple files; video is single-file.
  // existingUrls = already-uploaded media (e.g. loaded from a draft);
  // files = new local files still needing upload.
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audience, setAudience] = useState<PostAudience>("everyone");
  const [replyPermission, setReplyPermission] = useState<ReplyPermission>("everyone");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<"none" | "1" | "3" | "7">("1");

  useEffect(() => {
    if (!open) {
      setView("compose");
    }
  }, [open]);

  if (!open) return null;

  const needsMedia = type !== "text";
  const totalMediaCount = existingUrls.length + files.length;
  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollValid = !pollEnabled || validPollOptions.length >= 2;
  const canPost =
    userId && !uploading && pollValid && (type === "text" ? caption.trim().length > 0 || (pollEnabled && pollValid) : totalMediaCount > 0);
  const canSaveDraft = userId && !savingDraft && (caption.trim().length > 0 || totalMediaCount > 0);

  function reset() {
    setDraftId(null);
    setType("text");
    setCaption("");
    setExistingUrls([]);
    setFiles([]);
    setPreviewUrls([]);
    setAudience("everyone");
    setReplyPermission("everyone");
    setPollEnabled(false);
    setPollOptions(["", ""]);
    setPollDuration("1");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    if (type === "video") {
      const f = picked[0];
      setExistingUrls([]);
      setFiles([f]);
      setPreviewUrls([URL.createObjectURL(f)]);
      return;
    }

    setFiles((prev) => {
      const combined = [...prev, ...picked].slice(0, Math.max(0, MAX_PHOTOS - existingUrls.length));
      setPreviewUrls([...existingUrls, ...combined.map((f) => URL.createObjectURL(f))]);
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeMediaAt(idx: number) {
    if (idx < existingUrls.length) {
      const nextExisting = existingUrls.filter((_, i) => i !== idx);
      setExistingUrls(nextExisting);
      setPreviewUrls([...nextExisting, ...files.map((f) => URL.createObjectURL(f))]);
    } else {
      const fileIdx = idx - existingUrls.length;
      const nextFiles = files.filter((_, i) => i !== fileIdx);
      setFiles(nextFiles);
      setPreviewUrls([...existingUrls, ...nextFiles.map((f) => URL.createObjectURL(f))]);
    }
  }

  async function uploadPendingFiles(): Promise<string[]> {
    if (!userId || files.length === 0) return existingUrls;
    const uploaded = await Promise.all(files.map((f) => uploadMedia(f, userId)));
    return [...existingUrls, ...uploaded];
  }

  async function handlePost() {
    if (!userId) return;
    setUploading(true);
    try {
      const mediaUrls = needsMedia ? await uploadPendingFiles() : [];
      const post = await createPost({ authorId: userId, type, caption, mediaUrls, audience, replyPermission });
      if (type === "text" && pollEnabled && validPollOptions.length >= 2) {
        const closesAt =
          pollDuration === "none" ? null : new Date(Date.now() + Number(pollDuration) * 24 * 60 * 60 * 1000).toISOString();
        await createPoll(post.id, validPollOptions, closesAt);
      }
      if (draftId) {
        deleteDraft(draftId).catch(() => {});
        mutateDrafts();
      }
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

  async function handleSaveDraft() {
    if (!userId) return;
    setSavingDraft(true);
    try {
      const mediaUrls = needsMedia ? await uploadPendingFiles() : [];
      const id = await saveDraft({ id: draftId ?? undefined, userId, type, caption, mediaUrls });
      setDraftId(id);
      setExistingUrls(mediaUrls);
      setFiles([]);
      mutateDrafts();
      showToast("Draft saved");
    } catch (err) {
      console.error(err);
      showToast("Couldn't save draft — try again");
    } finally {
      setSavingDraft(false);
    }
  }

  function loadDraft(d: (typeof drafts)[number]) {
    setDraftId(d.id);
    setType(d.type);
    setCaption(d.caption);
    setExistingUrls(d.media_urls);
    setFiles([]);
    setPreviewUrls(d.media_urls);
    setView("compose");
  }

  async function handleDeleteDraft(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteDraft(id);
      mutateDrafts();
      if (draftId === id) reset();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[520px] md:rounded-2xl bg-surface border border-line rounded-t-2xl max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface z-10">
          <h2 className="font-display italic text-xl">{view === "drafts" ? "Drafts" : "New post"}</h2>
          <div className="flex items-center gap-3">
            {view === "compose" ? (
              <button onClick={() => setView("drafts")} className="text-xs font-mono text-muted hover:text-paper transition-colors">
                Drafts{drafts.length > 0 ? ` (${drafts.length})` : ""}
              </button>
            ) : (
              <button onClick={() => setView("compose")} className="text-xs font-mono text-muted hover:text-paper transition-colors">
                ← Back
              </button>
            )}
            <button onClick={close} aria-label="Close composer" className="p-1">
              <CloseIcon />
            </button>
          </div>
        </div>

        {view === "drafts" ? (
          <div className="px-5 py-4">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No drafts yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-line">
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => loadDraft(d)}
                    className="flex items-center gap-3 py-3 text-left hover:bg-surface2/50 transition-colors -mx-2 px-2 rounded-lg"
                  >
                    {d.media_urls[0] && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 shrink-0">
                        {d.type === "photo" ? (
                          <img src={d.media_urls[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={d.media_urls[0]} className="w-full h-full object-cover" muted />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{d.caption || <span className="text-muted italic">No caption</span>}</p>
                      <p className="text-xs text-muted font-mono mt-0.5 capitalize">
                        {d.type} · {timeAgo(d.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDraft(d.id, e)}
                      className="p-1.5 text-muted hover:text-danger transition-colors shrink-0"
                      aria-label="Delete draft"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <div className="flex gap-2 mb-4">
                {(["text", "photo", "video"] as PostType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setExistingUrls([]);
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
                        <div key={url + i} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-line">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeMediaAt(i)}
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

              <MentionHashtagTextarea
                value={caption}
                onChange={setCaption}
                placeholder={
                  type === "text"
                    ? "What's on your mind? Use #hashtags and @mentions."
                    : "Write a caption... #hashtags and @mentions work here too"
                }
                rows={type === "text" ? 5 : 3}
                className="w-full bg-surface2 rounded-xl p-3 text-[15px] placeholder:text-muted outline-none resize-none border border-line focus:border-muted"
                maxLength={500}
              />

              {type === "text" && (
                <div className="mt-3">
                  {!pollEnabled ? (
                    <button
                      onClick={() => setPollEnabled(true)}
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-paper transition-colors"
                    >
                      <ChartIcon size={15} /> Add a poll
                    </button>
                  ) : (
                    <div className="border border-line rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                          <ChartIcon size={14} /> Poll
                        </span>
                        <button
                          onClick={() => {
                            setPollEnabled(false);
                            setPollOptions(["", ""]);
                          }}
                          className="text-muted hover:text-danger transition-colors"
                          aria-label="Remove poll"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pollOptions.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={opt}
                              onChange={(e) =>
                                setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                              }
                              placeholder={`Option ${i + 1}`}
                              maxLength={60}
                              className="flex-1 bg-surface2 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted border border-line focus:border-muted"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))}
                                className="text-muted hover:text-danger transition-colors shrink-0"
                                aria-label={`Remove option ${i + 1}`}
                              >
                                <CloseIcon size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {pollOptions.length < MAX_POLL_OPTIONS && (
                        <button
                          onClick={() => setPollOptions((prev) => [...prev, ""])}
                          className="flex items-center gap-1 text-xs text-muted hover:text-paper transition-colors mt-2"
                        >
                          <PlusIcon size={12} /> Add option
                        </button>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted">Voting ends:</span>
                        {(["1", "3", "7", "none"] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setPollDuration(d)}
                            className={clsx(
                              "px-2.5 py-1 rounded-full text-xs border transition-colors",
                              pollDuration === d ? "bg-paper text-ink border-paper font-medium" : "border-line text-muted"
                            )}
                          >
                            {d === "none" ? "No limit" : `${d}d`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <div className="flex items-center bg-surface2 rounded-full border border-line p-0.5">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setAudience(o.value)}
                      className={clsx(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors",
                        audience === o.value ? "bg-paper text-ink" : "text-muted"
                      )}
                    >
                      {o.value === "everyone" && <GlobeIcon size={12} />}
                      {o.value === "followers" && <UsersIcon size={13} />}
                      {o.value === "close_friends" && <HeartIcon size={12} />}
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-surface2 rounded-full border border-line p-0.5">
                  <span className="text-[10px] text-muted pl-2 pr-1">Replies:</span>
                  {REPLY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setReplyPermission(o.value)}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors",
                        replyPermission === o.value ? "bg-paper text-ink" : "text-muted"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <span className="text-xs text-muted font-mono shrink-0">{caption.length}/500</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={!canSaveDraft}
                  className="text-sm font-medium text-muted hover:text-paper transition-colors disabled:opacity-40 px-3 py-2.5"
                >
                  {savingDraft ? "Saving..." : "Save draft"}
                </button>
                <button
                  onClick={handlePost}
                  disabled={!canPost}
                  className="bg-paper text-ink font-semibold rounded-full px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {uploading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
