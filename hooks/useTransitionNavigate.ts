"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Navigates using the View Transitions API when the browser supports it
 * (a soft crossfade between the old and new page), falling back to a
 * plain router.push everywhere else — Safari, older Firefox, etc. all
 * just get instant navigation exactly as before.
 */
export function useTransitionNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      const supportsViewTransitions =
        typeof document !== "undefined" && "startViewTransition" in document;
      if (supportsViewTransitions) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router]
  );
}
