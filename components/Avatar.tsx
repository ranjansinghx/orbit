"use client";

import { useState } from "react";
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
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full bg-surface2",
        ring && "ring-2 ring-video ring-offset-2 ring-offset-ink",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // Plain <img>, not next/image — avoids depending on every media
        // host being whitelisted in next.config.js's remotePatterns, which
        // is exactly what broke this before. onError below is the real
        // safety net: any load failure for any reason falls back to the
        // default silhouette instead of ever showing broken-image alt text.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
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
