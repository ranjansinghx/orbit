"use client";

import { create } from "zustand";
import { PostType } from "@/lib/supabase/database.types";

export interface PendingPost {
  id: string; // temp client-side id, not a real post id
  type: PostType;
  caption: string;
  previewUrls: string[]; // local object URLs — revoked once the real post lands
  authorAvatarUrl: string;
  authorDisplayName: string;
  authorUsername: string;
  createdAt: string;
  status: "uploading" | "error";
}

interface PendingPostsState {
  pendingPosts: PendingPost[];
  addPendingPost: (p: PendingPost) => void;
  markPendingError: (id: string) => void;
  removePendingPost: (id: string) => void;
}

/**
 * Posts the Composer has submitted but that haven't round-tripped through
 * the server yet. Feed pages render these at the top of their list (in an
 * "uploading" state) so the post appears the instant you hit Post, instead
 * of only after the next feed fetch. Cleared once the real post is
 * confirmed (see Composer's handlePost) or on failure.
 */
export const usePendingPostsStore = create<PendingPostsState>((set) => ({
  pendingPosts: [],
  addPendingPost: (p) => set((s) => ({ pendingPosts: [p, ...s.pendingPosts] })),
  markPendingError: (id) =>
    set((s) => ({ pendingPosts: s.pendingPosts.map((p) => (p.id === id ? { ...p, status: "error" } : p)) })),
  removePendingPost: (id) => set((s) => ({ pendingPosts: s.pendingPosts.filter((p) => p.id !== id) })),
}));
