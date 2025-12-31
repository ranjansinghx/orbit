"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS, PlusIcon } from "@/components/icons";
import OrbitMark from "@/components/OrbitMark";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useUnreadCounts } from "@/lib/supabase/hooks";

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/profile")) return pathname.startsWith("/profile");
  return pathname.startsWith(href);
}

export default function SidebarNav() {
  const pathname = usePathname();
  const openComposer = useUIStore((s) => s.openComposer);
  const { profile, userId } = useCurrentProfile();
  const unread = useUnreadCounts(userId ?? undefined);

  if (pathname === "/login") return null;

  return (
    <nav className="hidden md:flex md:flex-col md:w-64 lg:w-72 shrink-0 h-screen sticky top-0 border-r border-line px-4 py-6">
      <Link href="/" className="flex items-center gap-2 px-2 mb-8">
        <OrbitMark size={30} />
        <span className="font-display italic text-2xl tracking-tight">Orbit</span>
      </Link>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const href = item.key === "profile" && profile ? `/profile/${profile.username}` : item.href;
          const active = isItemActive(pathname, item.key === "profile" ? "/profile" : item.href);
          const badge =
            item.key === "notifications" ? unread.notifications : item.key === "messages" ? unread.messages : 0;
          return (
            <li key={item.key}>
              <Link
                href={href}
                className={clsx(
                  "flex items-center gap-4 px-3 py-3 rounded-xl transition-colors relative",
                  active ? "bg-surface text-paper" : "text-muted hover:bg-surface/60 hover:text-paper"
                )}
              >
                <Icon active={active} />
                <span className={clsx("text-[17px]", active && "font-semibold")}>{item.label}</span>
                {badge > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-video text-[11px] font-mono flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        onClick={openComposer}
        className="mt-6 flex items-center justify-center gap-2 bg-paper text-ink font-semibold rounded-full py-3 hover:opacity-90 transition-opacity"
      >
        <PlusIcon size={20} />
        Post
      </button>

      <div className="mt-auto pt-6 text-xs text-muted font-mono px-2">
        Orbit &middot; v1
      </div>
    </nav>
  );
}
