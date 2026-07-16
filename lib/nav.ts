export interface NavItem {
  href: string | null; // null means it's an action (opens composer), not a route
  label: string;
  key: string;
}

// Mobile bottom bar — compact, icon-only, 5 slots.
// Profile's href is filled in at render time with the signed-in user's username.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/messages", label: "Messages", key: "messages" },
  { href: null, label: "Post", key: "compose" },
  { href: "/notifications", label: "Notifications", key: "notifications" },
  { href: "/profile", label: "Profile", key: "profile" },
];

// Desktop sidebar — the fuller labeled list. Search and Saved live here
// (not on mobile, where a 5-icon bar is the standard convention);
// "Following" renders separately, under a "Feeds" section, since it's a
// feed variant of Home rather than a peer nav destination.
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/", label: "For you", key: "home" },
  { href: null, label: "New post", key: "compose" },
  { href: "/search", label: "Search", key: "search" },
  { href: "/messages", label: "Messages", key: "messages" },
  { href: "/notifications", label: "Activity", key: "notifications" },
  { href: "/profile", label: "Profile", key: "profile" },
  { href: "/saved", label: "Saved", key: "saved" },
];
