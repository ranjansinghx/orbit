"use client";

import { create } from "zustand";

interface UIState {
  composerOpen: boolean;
  commentsPostId: string | null;
  settingsOpen: boolean;
  toast: string | null;
  openComposer: () => void;
  closeComposer: () => void;
  openComments: (postId: string) => void;
  closeComments: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  composerOpen: false,
  commentsPostId: null,
  settingsOpen: false,
  toast: null,
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  openComments: (postId) => set({ commentsPostId: postId }),
  closeComments: () => set({ commentsPostId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set((s) => (s.toast === msg ? { toast: null } : s)), 2200);
  },
}));
