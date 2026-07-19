"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { SIDEBAR_ITEMS } from "@/lib/nav";
import { HomeIcon, PlusIcon, SearchIcon, MessagesIcon, HeartIcon, ProfileIcon, BookmarkIcon } from "@/components/icons";
import OrbitMark from "@/components/OrbitMark";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useUnreadCounts } from "@/lib/supabase/hooks";
import Avatar from "@/components/Avatar";

const DOUBLE_TAP_MS = 350;

function isItemActive(pathname: string, key: string, href: string | null) {
  if (href === null) return false;
  if (key === "home") return pathname === "/";
  if (key === "profile") return pathname.startsWith("/profile");
  return pathname.startsWith(href);
}

function RowIcon({ itemKey, active }: { itemKey: string; active: boolean }) {
  switch (itemKey) {
    case "home":
      return <HomeIcon active={active} size={23} />;
    case "compose":
      return <PlusIcon size={23} className={active ? "text-paper" : "text-muted"} />;
    case "search":
      return <SearchIcon active={active} size={23} />;
    case "messages":
      return <MessagesIcon active={active} size={23} />;
    case "notifications":
      return <HeartIcon active={active} size={23} />;
    case "profile":
      return <ProfileIcon active={active} size={23} />;
    case "saved":
      return <BookmarkIcon active={active} size={21} />;
    default:
      return null;
  }
}

export default function SidebarNav() {
  const pathname = usePathname();
  const openComposer = useUIStore((s) => s.openComposer);
  const triggerHomeRefresh = useUIStore((s) => s.triggerHomeRefresh);
  const { profile, userId } = useCurrentProfile();
  const unread = useUnreadCounts(userId ?? undefined);
  const lastHomeTap = useRef(0);

  if (pathname === "/login") return null;

  function handleHomeClick(e: React.MouseEvent) {
    if (pathname !== "/") return;
    const now = Date.now();
    if (now - lastHomeTap.current < DOUBLE_TAP_MS) {
      e.preventDefault();
      triggerHomeRefresh();
    }
    lastHomeTap.current = now;
  }

  return (
    <nav className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-line px-4 py-6">
      <Link href="/" className="flex items-center gap-2 px-3 mb-6">
        <OrbitMark size={28} />
        <span className="font-display italic text-2xl tracking-tight">Orbit</span>
      </Link>

      <ul className="flex flex-col gap-0.5">
        {SIDEBAR_ITEMS.map((item) => {
          const href = item.key === "profile" && profile ? `/profile/${profile.username}` : item.href;
          const active = isItemActive(pathname, item.key, item.key === "profile" ? "/profile" : item.href);
          const badge =
            item.key === "notifications" ? unread.notifications : item.key === "messages" ? unread.messages : 0;

          const rowClasses = clsx(
            "flex items-center gap-3.5 px-4 py-2.5 rounded-full transition-colors relative w-fit text-left",
            active ? "bg-surface text-paper font-semibold" : "text-paper/90 hover:bg-surface/60"
          );

          const inner = (
            <>
              {item.key === "profile" && profile ? (
                <Avatar src={profile.avatar_url} alt={profile.display_name} size={22} />
              ) : (
                <RowIcon itemKey={item.key} active={active} />
              )}
              <span className="text-[15px]">{item.label}</span>
              {badge > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-video text-[10px] font-mono flex items-center justify-center">
                  {badge}
                </span>
              )}
            </>
          );

          return (
            <li key={item.key}>
              {item.href === null ? (
                <button onClick={() => openComposer()} className={rowClasses}>
                  {inner}
                </button>
              ) : (
                <Link href={href!} className={rowClasses} onClick={item.key === "home" ? handleHomeClick : undefined}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line mt-5 pt-4">
        <div className="flex items-center justify-between px-4 mb-1">
          <span className="text-xs text-muted font-mono uppercase tracking-wide">Feeds</span>
        </div>
        <Link
          href="/text"
          className={clsx(
            "flex items-center px-4 py-2 rounded-full transition-colors w-fit text-[15px]",
            pathname === "/text" ? "text-paper font-semibold bg-surface" : "text-paper/70 hover:bg-surface/60"
          )}
        >
          Following
        </Link>
      </div>

      <div className="mt-auto pt-6 text-xs text-muted font-mono px-4">Orbit &middot; v1</div>
    </nav>
  );
}
