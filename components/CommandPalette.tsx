"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSearch } from "@/lib/supabase/hooks";
import { useUIStore } from "@/lib/store/useUIStore";
import Avatar from "@/components/Avatar";
import {
  HomeIcon,
  TextIcon,
  SearchIcon,
  MessagesIcon,
  HeartIcon,
  BookmarkIcon,
  ProfileIcon,
  GearIcon,
  PlusIcon,
} from "@/components/icons";

interface StaticDestination {
  label: string;
  hint?: string;
  href: string;
  icon: React.ReactNode;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { profile } = useCurrentProfile();
  const openComposer = useUIStore((s) => s.openComposer);
  const openSettings = useUIStore((s) => s.openSettings);
  const { people } = useSearch(query.length > 0 ? query : "");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const destinations: StaticDestination[] = [
    { label: "Home", href: "/", icon: <HomeIcon size={17} /> },
    { label: "Following", href: "/text", icon: <TextIcon size={17} /> },
    { label: "Search", href: "/search", icon: <SearchIcon size={17} /> },
    { label: "Messages", href: "/messages", icon: <MessagesIcon size={17} /> },
    { label: "Activity", href: "/notifications", icon: <HeartIcon size={17} /> },
    { label: "Saved", href: "/saved", icon: <BookmarkIcon size={17} /> },
    ...(profile ? [{ label: "Your profile", href: `/profile/${profile.username}`, icon: <ProfileIcon size={17} /> }] : []),
  ];

  const filteredDestinations = query
    ? destinations.filter((d) => d.label.toLowerCase().includes(query.toLowerCase()))
    : destinations;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-[12vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <SearchIcon size={17} active />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to, or search people..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted"
          />
          <kbd className="text-[10px] text-muted border border-line rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {!query && (
            <button
              onClick={() => {
                setOpen(false);
                openComposer();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2 transition-colors text-left"
            >
              <PlusIcon size={17} />
              New post
            </button>
          )}

          {filteredDestinations.map((d) => (
            <button
              key={d.href}
              onClick={() => go(d.href)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2 transition-colors text-left"
            >
              {d.icon}
              {d.label}
            </button>
          ))}

          {!query && (
            <button
              onClick={() => {
                setOpen(false);
                openSettings();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2 transition-colors text-left"
            >
              <GearIcon size={17} />
              Settings
            </button>
          )}

          {query && people.length > 0 && (
            <div className="border-t border-line mt-1 pt-1">
              <p className="px-4 py-1 text-[11px] text-muted uppercase tracking-wide">People</p>
              {people.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/profile/${p.username}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface2 transition-colors text-left"
                >
                  <Avatar src={p.avatar_url} alt={p.display_name} size={24} />
                  <span className="font-medium">{p.display_name}</span>
                  <span className="text-muted">@{p.username}</span>
                </button>
              ))}
            </div>
          )}

          {query && people.length === 0 && filteredDestinations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted text-center">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
