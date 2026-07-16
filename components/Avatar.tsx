import Image from "next/image";
import clsx from "clsx";

export default function Avatar({
  src,
  alt,
  size = 40,
  ring,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full bg-surface2",
        ring && "ring-2 ring-video ring-offset-2 ring-offset-ink",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <svg
          viewBox="0 0 40 40"
          width="100%"
          height="100%"
          className="absolute inset-0"
          aria-label={alt}
          role="img"
        >
          <rect width="40" height="40" fill="#E4E4E2" />
          <circle cx="20" cy="15.5" r="7" fill="#9B9B9B" />
          <path d="M4 38c0-9.4 7.2-15 16-15s16 5.6 16 15" fill="#9B9B9B" />
        </svg>
      )}
    </div>
  );
}
