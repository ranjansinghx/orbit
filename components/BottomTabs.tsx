"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/icons";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useUnreadCounts } from "@/lib/supabase/hooks";

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/profile")) return pathname.startsWith("/profile");
  return pathname.startsWith(href);
}

export default function BottomTabs() {
  const pathname = usePathname();
  const { profile, userId } = useCurrentProfile();
  const unread = useUnreadCounts(userId ?? undefined);

  if (pathname === "/login") return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-ink/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const href = item.key === "profile" && profile ? `/profile/${profile.username}` : item.href;
          const active = isItemActive(pathname, item.key === "profile" ? "/profile" : item.href);
          const badge =
            item.key === "notifications" ? unread.notifications : item.key === "messages" ? unread.messages : 0;
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-1 py-2.5 relative"
              >
                <span className="relative">
                  <Icon active={active} size={23} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-video text-[9px] font-mono flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </span>
                <span className={clsx("text-[10px]", active ? "text-paper font-medium" : "text-muted")}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
