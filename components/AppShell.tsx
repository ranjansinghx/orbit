"use client";

import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";
import BottomTabs from "@/components/BottomTabs";
import Composer from "@/components/Composer";
import CommentsSheet from "@/components/CommentsSheet";
import SettingsModal from "@/components/SettingsModal";
import EditPostModal from "@/components/EditPostModal";
import ReportModal from "@/components/ReportModal";
import LikersSheet from "@/components/LikersSheet";
import Toast from "@/components/Toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

      <Composer />
      <CommentsSheet />
      <SettingsModal />
      <EditPostModal />
      <ReportModal />
      <LikersSheet />
      <Toast />
    </div>
  );
}
