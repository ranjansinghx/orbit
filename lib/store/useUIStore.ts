"use client";

import { create } from "zustand";
import { PostType } from "@/lib/supabase/database.types";

interface ReportTarget {
  type: "post" | "user";
  id: string;
}

export interface ComposerDraft {
  id: string;
  type: PostType;
  caption: string;
  mediaUrls: string[];
}

interface UIState {
  composerOpen: boolean;
  composerDraft: ComposerDraft | null;
  commentsPostId: string | null;
  settingsOpen: boolean;
  editingPostId: string | null;
  reportTarget: ReportTarget | null;
  likersPostId: string | null;
  quoteRepostPostId: string | null;
  newGroupOpen: boolean;
  insightsPostId: string | null;
  homeRefreshSignal: number;
  followingRefreshSignal: number;
  toast: string | null;
  openComposer: (draft?: ComposerDraft) => void;
  closeComposer: () => void;
  openComments: (postId: string) => void;
  closeComments: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openEdit: (postId: string) => void;
  closeEdit: () => void;
  openReport: (target: ReportTarget) => void;
  closeReport: () => void;
  openLikers: (postId: string) => void;
  closeLikers: () => void;
  openQuoteRepost: (postId: string) => void;
  closeQuoteRepost: () => void;
  openNewGroup: () => void;
  closeNewGroup: () => void;
  openInsights: (postId: string) => void;
  closeInsights: () => void;
  triggerHomeRefresh: () => void;
  triggerFollowingRefresh: () => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  composerOpen: false,
  composerDraft: null,
  commentsPostId: null,
  settingsOpen: false,
  editingPostId: null,
  reportTarget: null,
  likersPostId: null,
  quoteRepostPostId: null,
  newGroupOpen: false,
  insightsPostId: null,
  homeRefreshSignal: 0,
  followingRefreshSignal: 0,
  toast: null,
  openComposer: (draft) => set({ composerOpen: true, composerDraft: draft ?? null }),
  closeComposer: () => set({ composerOpen: false, composerDraft: null }),
  openComments: (postId) => set({ commentsPostId: postId }),
  closeComments: () => set({ commentsPostId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openEdit: (postId) => set({ editingPostId: postId }),
  closeEdit: () => set({ editingPostId: null }),
  openReport: (target) => set({ reportTarget: target }),
  closeReport: () => set({ reportTarget: null }),
  openLikers: (postId) => set({ likersPostId: postId }),
  closeLikers: () => set({ likersPostId: null }),
  openQuoteRepost: (postId) => set({ quoteRepostPostId: postId }),
  closeQuoteRepost: () => set({ quoteRepostPostId: null }),
  openNewGroup: () => set({ newGroupOpen: true }),
  closeNewGroup: () => set({ newGroupOpen: false }),
  openInsights: (postId) => set({ insightsPostId: postId }),
  closeInsights: () => set({ insightsPostId: null }),
  triggerHomeRefresh: () => set((s) => ({ homeRefreshSignal: s.homeRefreshSignal + 1 })),
  triggerFollowingRefresh: () => set((s) => ({ followingRefreshSignal: s.followingRefreshSignal + 1 })),
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set((s) => (s.toast === msg ? { toast: null } : s)), 2200);
  },
}));
