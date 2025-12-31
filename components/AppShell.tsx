"use client";

import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import BottomTabs from "@/components/BottomTabs";
import Composer from "@/components/Composer";
import CommentsSheet from "@/components/CommentsSheet";
import SettingsModal from "@/components/SettingsModal";
import Toast from "@/components/Toast";
import { PlusIcon } from "@/components/icons";
import { useUIStore } from "@/lib/store/useUIStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const openComposer = useUIStore((s) => s.openComposer);
  const isFullScreenFeed = pathname === "/";
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className={isFullScreenFeed ? "flex-1" : "flex-1 pb-16 md:pb-0"}>
        {children}
      </main>
      <BottomTabs />

      {!isFullScreenFeed && (
        <button
          onClick={openComposer}
          aria-label="Create post"
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-paper text-ink flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <PlusIcon size={26} />
        </button>
      )}

      <Composer />
      <CommentsSheet />
      <SettingsModal />
      <Toast />
    </div>
  );
}
