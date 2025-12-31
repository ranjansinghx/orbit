export interface NavItem {
  href: string;
  label: string;
  key: string;
}

// Exact order per spec: Home, Text, Messages, Notifications, Search, Profile
// Profile's href is filled in at render time with the signed-in user's username.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/text", label: "Text", key: "text" },
  { href: "/messages", label: "Messages", key: "messages" },
  { href: "/notifications", label: "Notifications", key: "notifications" },
  { href: "/search", label: "Search", key: "search" },
  { href: "/profile", label: "Profile", key: "profile" },
];
