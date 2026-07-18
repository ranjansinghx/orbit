type IconProps = { active?: boolean; size?: number; className?: string };

const stroke = (active?: boolean) => (active ? "rgb(var(--color-paper))" : "rgb(var(--color-muted))");

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
        d="M21.5 2.5 11 13M21.5 2.5 15 21.5l-4-8.5-8.5-4L21.5 2.5Z"
        stroke={stroke(active)}
        strokeWidth="1.7"
        strokeLinecap="round"
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

export function ComposeIcon({ active, size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke={stroke(active)} strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke={stroke(active)} strokeWidth="1.8" strokeLinecap="round" />
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
  compose: ComposeIcon,
  notifications: NotificationsIcon,
  search: SearchIcon,
  profile: ProfileIcon,
};

export function HeartIcon({
  filled,
  active,
  size = 22,
  className,
}: {
  filled?: boolean;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  const strokeColor = filled
    ? "rgb(var(--color-video))"
    : active
    ? "rgb(var(--color-paper))"
    : "rgb(var(--color-muted))";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "rgb(var(--color-video))" : "none"} className={className}>
      <path
        d="M12 20.5C12 18 4 14 4 9C4 5.5 7 3.5 9.5 3.5C11 3.5 12 4.5 12 6.5C12 4.5 13 3.5 14.5 3.5C17 3.5 20 5.5 20 9C20 14 12 18 12 20.5Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CommentIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M21 12c0 4.14-4.03 7.5-9 7.5-1.06 0-2.08-.15-3.02-.43L4 20.5l1.2-3.6C4.44 15.7 4 13.9 4 12c0-4.14 4.03-7.5 9-7.5s8 3.36 8 7.5Z"
        stroke="rgb(var(--color-paper))"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RepostIcon({ active, size = 17, className }: { active?: boolean; size?: number; className?: string }) {
  const color = active ? "rgb(var(--color-text))" : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 7h9a3 3 0 0 1 3 3v2M6 7 9 4M6 7l3 3"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 17H9a3 3 0 0 1-3-3v-2M18 17l-3 3M18 17l-3-3"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
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
        stroke="rgb(var(--color-paper))"
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
      <path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.71 6.71 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        stroke="rgb(var(--color-paper))"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        stroke="rgb(var(--color-paper))"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 14, double, read }: { size?: number; double?: boolean; read?: boolean }) {
  const color = read ? "rgb(var(--color-text))" : "rgb(var(--color-muted))";
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
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="rgb(var(--color-muted))" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" stroke="rgb(var(--color-muted))" strokeWidth="1.4" />
      <path d="M5 17l4.5-4.5 3 3L18 10l1 1.5" stroke="rgb(var(--color-muted))" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20l16-8L4 4l0 6.5 10 1.5-10 1.5L4 20Z" fill="rgb(var(--color-paper))" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 5l14 14M19 5 5 19" stroke="rgb(var(--color-paper))" strokeWidth="1.8" strokeLinecap="round" />
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
      <rect x="3" y="6" width="12" height="12" rx="2" stroke="rgb(var(--color-muted))" strokeWidth="1.6" />
      <path d="M15 10l6-3v10l-6-3v-4Z" stroke="rgb(var(--color-muted))" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkIcon({
  filled,
  active,
  size = 20,
  className,
}: {
  filled?: boolean;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  const strokeColor = filled
    ? "rgb(var(--color-text))"
    : active
    ? "rgb(var(--color-paper))"
    : "rgb(var(--color-muted))";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "rgb(var(--color-text))" : "none"} className={className}>
      <path
        d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"
        stroke={strokeColor}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoreIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="5" cy="12" r="1.6" fill="rgb(var(--color-muted))" />
      <circle cx="12" cy="12" r="1.6" fill="rgb(var(--color-muted))" />
      <circle cx="19" cy="12" r="1.6" fill="rgb(var(--color-muted))" />
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
