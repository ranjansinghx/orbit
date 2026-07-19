"use client";

import { ReactNode } from "react";
import OrbitMark from "@/components/OrbitMark";

/**
 * A consistent empty-state pattern: the Orbit mark drawn faint and
 * oversized, a short headline, one line of body copy, and an optional
 * action. Used anywhere a feed/list/grid has nothing in it yet.
 */
export default function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-8 py-16">
      <div className="relative flex items-center justify-center w-16 h-16">
        {icon ?? (
          <span className="opacity-25">
            <OrbitMark size={40} />
          </span>
        )}
      </div>
      <div>
        <p className="font-display italic text-lg">{title}</p>
        {body && <p className="text-sm text-muted mt-1 max-w-xs">{body}</p>}
      </div>
      {action}
    </div>
  );
}
