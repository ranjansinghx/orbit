type IconProps = { active?: boolean; size?: number; className?: string };

const stroke = (active?: boolean) => (active ? "#F2F1EC" : "#8A8A94");

export function HomeIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"
        stroke={stroke(active)}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TextIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 5h16M4 10.5h16M4 16h10"
        stroke={stroke(active)}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MessagesIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M21 12c0 4.14-4.03 7.5-9 7.5-1.06 0-2.08-.15-3.02-.43L4 20.5l1.2-3.6C4.44 15.7 4 13.9 4 12c0-4.14 4.03-7.5 9-7.5s8 3.36 8 7.5Z"
        stroke={stroke(active)}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotificationsIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z"
        stroke={stroke(active)}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke={stroke(active)} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke={stroke(active)} strokeWidth="1.8" />
      <path d="M20 20 15.2 15.2" stroke={stroke(active)} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8.2" r="3.4" stroke={stroke(active)} strokeWidth="1.8" />
      <path
        d="M4.8 19.5c1.2-3.2 4-4.7 7.2-4.7s6 1.5 7.2 4.7"
        stroke={stroke(active)}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const NAV_ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  home: HomeIcon,
  text: TextIcon,
  messages: MessagesIcon,
  notifications: NotificationsIcon,
  search: SearchIcon,
  profile: ProfileIcon,
};

export function HeartIcon({ filled, size = 22, className }: { filled?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#FF5A36" : "none"} className={className}>
      <path
        d="M12 20s-7.2-4.4-9.5-9C1 7.5 3 4 6.7 4c2 0 3.5 1.2 4.3 2.6C11.8 5.2 13.3 4 15.3 4 19 4 21 7.5 19.5 11c-2.3 4.6-9.5 9-9.5 9Z"
        stroke={filled ? "#FF5A36" : "#F2F1EC"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M21 12c0 4.14-4.03 7.5-9 7.5-1.06 0-2.08-.15-3.02-.43L4 20.5l1.2-3.6C4.44 15.7 4 13.9 4 12c0-4.14 4.03-7.5 9-7.5s8 3.36 8 7.5Z"
        stroke="#F2F1EC"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 12.5 17 7m-10 5.5 10 5.5M7 12.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm14-7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm0 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
        stroke="#F2F1EC"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" stroke="#F2F1EC" strokeWidth="1.7" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4.5a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 6.15 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 10.5 4.6h.09A1.7 1.7 0 0 0 12.13 3h.24a1.7 1.7 0 0 0 1.5 1.6h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 18.3 9c.14.62.62 1.13 1.24 1.36.2.07.4.11.6.11h.36a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"
        stroke="#F2F1EC"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 14, double, read }: { size?: number; double?: boolean; read?: boolean }) {
  const color = read ? "#35C7FF" : "#8A8A94";
  return (
    <svg width={double ? size * 1.4 : size} height={size} viewBox="0 0 20 14" fill="none">
      <path d="M1 7l4 4L13 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {double && <path d="M7 7l4 4L19 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function ImageIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="#8A8A94" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" stroke="#8A8A94" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5 3 3L18 10l1 1.5" stroke="#8A8A94" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20l16-8L4 4l0 6.5 10 1.5-10 1.5L4 20Z" fill="#F2F1EC" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5 5 19" stroke="#F2F1EC" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FlagIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5 4h11l-2.5 3.5L16 11H5V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AtIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VideoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="12" height="12" rx="2" stroke="#8A8A94" strokeWidth="1.6" />
      <path d="M15 10l6-3v10l-6-3v-4Z" stroke="#8A8A94" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkIcon({ filled, size = 20, className }: { filled?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#35C7FF" : "none"} className={className}>
      <path
        d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"
        stroke={filled ? "#35C7FF" : "#F2F1EC"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoreIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="5" cy="12" r="1.6" fill="#8A8A94" />
      <circle cx="12" cy="12" r="1.6" fill="#8A8A94" />
      <circle cx="19" cy="12" r="1.6" fill="#8A8A94" />
    </svg>
  );
}

export function TrashIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4L17 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlockIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.3 6.3l11.4 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
