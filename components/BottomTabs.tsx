"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/icons";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useUnreadCounts } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import Avatar from "@/components/Avatar";

const DOUBLE_TAP_MS = 350;

function isItemActive(pathname: string, href: string | null) {
  if (href === null) return false;
  if (href === "/") return pathname === "/";
  if (href.startsWith("/profile")) return pathname.startsWith("/profile");
  return pathname.startsWith(href);
}

export default function BottomTabs() {
  const pathname = usePathname();
  const { profile, userId } = useCurrentProfile();
  const unread = useUnreadCounts(userId ?? undefined);
  const openComposer = useUIStore((s) => s.openComposer);
  const triggerHomeRefresh = useUIStore((s) => s.triggerHomeRefresh);
  const lastHomeTap = useRef(0);

  if (pathname === "/login") return null;

  function handleHomeClick(e: React.MouseEvent) {
    if (pathname !== "/") return; // let the normal navigation happen otherwise
    const now = Date.now();
    if (now - lastHomeTap.current < DOUBLE_TAP_MS) {
      e.preventDefault();
      triggerHomeRefresh();
    }
    lastHomeTap.current = now;
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-ink/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const href = item.key === "profile" && profile ? `/profile/${profile.username}` : item.href;
          const active = isItemActive(pathname, item.key === "profile" ? "/profile" : item.href);
          const badge =
            item.key === "notifications" ? unread.notifications : item.key === "messages" ? unread.messages : 0;

          const content = (
            <span
              className={clsx(
                "relative flex items-center justify-center rounded-full transition-colors",
                active && item.key !== "profile" && item.key !== "compose" && "bg-surface"
              )}
              style={{ width: 44, height: 36 }}
            >
              {item.key === "profile" && profile ? (
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  size={26}
                  ring={active}
                />
              ) : (
                <Icon active={active} size={item.key === "compose" ? 26 : 24} />
              )}
              {badge > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-video text-[9px] font-mono flex items-center justify-center">
                  {badge}
                </span>
              )}
            </span>
          );

          return (
            <li key={item.key} className="flex-1">
              {item.href === null ? (
                <button
                  onClick={() => openComposer()}
                  className="w-full flex items-center justify-center py-3"
                  aria-label="Create post"
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={href!}
                  aria-label={item.label}
                  className="flex items-center justify-center py-3"
                  onClick={item.key === "home" ? handleHomeClick : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
