"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/icons";
import OrbitMark from "@/components/OrbitMark";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useUnreadCounts } from "@/lib/supabase/hooks";
import Avatar from "@/components/Avatar";

function isItemActive(pathname: string, href: string | null) {
  if (href === null) return false;
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

          const rowClasses = clsx(
            "flex items-center gap-4 px-3 py-3 rounded-xl transition-colors relative w-full text-left",
            active ? "bg-surface text-paper" : "text-muted hover:bg-surface/60 hover:text-paper"
          );

          const inner = (
            <>
              {item.key === "profile" && profile ? (
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  size={24}
                />
              ) : (
                <Icon active={active} />
              )}
              <span className={clsx("text-[17px]", active && "font-semibold")}>{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-video text-[11px] font-mono flex items-center justify-center">
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
                <Link href={href!} className={rowClasses}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6 text-xs text-muted font-mono px-2">Orbit &middot; v1</div>
    </nav>
  );
}
