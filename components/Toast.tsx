"use client";

import { useUIStore } from "@/lib/store/useUIStore";

export default function Toast() {
  const toast = useUIStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-paper text-ink text-sm font-medium px-4 py-2.5 rounded-full shadow-lg animate-slide-up">
      {toast}
    </div>
  );
}
