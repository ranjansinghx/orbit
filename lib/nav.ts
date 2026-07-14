export interface NavItem {
  href: string | null; // null means it's an action (opens composer), not a route
  label: string;
  key: string;
}

// Home | Messages | + (compose) | Notifications | Profile
// Text and Search moved to icon buttons in Home's own top bar.
// Profile's href is filled in at render time with the signed-in user's username.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/messages", label: "Messages", key: "messages" },
  { href: null, label: "Post", key: "compose" },
  { href: "/notifications", label: "Notifications", key: "notifications" },
  { href: "/profile", label: "Profile", key: "profile" },
];
