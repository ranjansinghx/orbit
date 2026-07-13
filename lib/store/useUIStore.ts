"use client";

import { create } from "zustand";

interface UIState {
  composerOpen: boolean;
  commentsPostId: string | null;
  settingsOpen: boolean;
  editingPostId: string | null;
  toast: string | null;
  openComposer: () => void;
  closeComposer: () => void;
  openComments: (postId: string) => void;
  closeComments: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openEdit: (postId: string) => void;
  closeEdit: () => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  composerOpen: false,
  commentsPostId: null,
  settingsOpen: false,
  editingPostId: null,
  toast: null,
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  openComments: (postId) => set({ commentsPostId: postId }),
  closeComments: () => set({ commentsPostId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openEdit: (postId) => set({ editingPostId: postId }),
  closeEdit: () => set({ editingPostId: null }),
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set((s) => (s.toast === msg ? { toast: null } : s)), 2200);
  },
}));
