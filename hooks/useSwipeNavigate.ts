"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SWIPE_THRESHOLD = 60; // px of horizontal drag to trigger navigation
const MAX_VERTICAL = 50; // px of vertical drift allowed before we treat it as a scroll, not a swipe

/**
 * Horizontal swipe navigation between two adjacent feeds/tabs. Attach the
 * returned ref to the swipeable container. A left swipe goes to `rightHref`,
 * a right swipe goes to `leftHref` — either can be null to disable that
 * direction (e.g. there's nothing further left than Home).
 */
export function useSwipeNavigate<T extends HTMLElement>(leftHref: string | null, rightHref: string | null) {
  const ref = useRef<T>(null);
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking.current) return;
      tracking.current = false;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dy) > MAX_VERTICAL) return; // vertical scroll, not a swipe
      if (dx <= -SWIPE_THRESHOLD && rightHref) router.push(rightHref);
      else if (dx >= SWIPE_THRESHOLD && leftHref) router.push(leftHref);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [leftHref, rightHref, router]);

  return ref;
}
