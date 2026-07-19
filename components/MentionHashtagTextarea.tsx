"use client";

import { useMemo, useRef, useState } from "react";
import { useMentionSuggestions, useHashtagSuggestions } from "@/lib/supabase/hooks";
import Avatar from "@/components/Avatar";

/**
 * A plain textarea with a live @mention / #hashtag suggestion dropdown.
 * Detects the token under the cursor (not full parsing of the whole body —
 * only what's being actively typed), queries matching people/hashtags, and
 * splices the selection back in at the right spot on click.
 */
export default function MentionHashtagTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);

  const activeToken = useMemo(() => {
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/(^|\s)([@#][a-zA-Z0-9_.]*)$/);
    if (!match) return null;
    const token = match[2];
    return { kind: token[0] as "@" | "#", query: token.slice(1), start: cursor - token.length };
  }, [value, cursor]);

  const mentionResults = useMentionSuggestions(activeToken?.kind === "@" ? activeToken.query : "");
  const hashtagResults = useHashtagSuggestions(activeToken?.kind === "#" ? activeToken.query : "");

  const showDropdown = !!activeToken && (activeToken.kind === "@" ? mentionResults.length > 0 : hashtagResults.length > 0);

  function applySelection(replacement: string) {
    if (!activeToken) return;
    const before = value.slice(0, activeToken.start);
    const after = value.slice(cursor);
    const next = `${before}${replacement} ${after}`;
    onChange(next);
    const newCursor = before.length + replacement.length + 1;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(newCursor, newCursor);
      setCursor(newCursor);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyUp={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
        onClick={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
        autoFocus={autoFocus}
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface border border-line rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {activeToken!.kind === "@"
            ? mentionResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applySelection(`@${p.username}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-surface2 transition-colors"
                >
                  <Avatar src={p.avatar_url} alt={p.display_name} size={26} />
                  <span className="font-medium">{p.display_name}</span>
                  <span className="text-muted">@{p.username}</span>
                </button>
              ))
            : hashtagResults.map((tag) => (
                <button
                  key={tag}
                  onClick={() => applySelection(`#${tag}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-surface2 transition-colors"
                >
                  #{tag}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
