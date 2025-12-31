import Link from "next/link";

export default function HashtagText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Link
            key={i}
            href={`/hashtag/${part.slice(1).toLowerCase()}`}
            className="text-text font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
