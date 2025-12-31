import Image from "next/image";
import clsx from "clsx";

export default function Avatar({
  src,
  alt,
  size = 40,
  ring,
  className,
}: {
  src: string;
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
      <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
    </div>
  );
}
