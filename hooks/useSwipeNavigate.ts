"use client";

import { RefObject, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SWIPE_THRESHOLD = 60; // px of horizontal drag to trigger navigation
const MAX_VERTICAL = 50; // px of vertical drift allowed before we treat it as a scroll, not a swipe

/**
 * Horizontal swipe navigation between two adjacent feeds/tabs. Takes an
 * existing ref to the swipeable container (same pattern as
 * usePullToRefresh) rather than creating its own — that way callers who
 * also need the container ref for other purposes (scroll tracking, pull-
 * to-refresh) just pass the one ref everywhere, no manual ref-merging
 * required. A left swipe goes to `rightHref`, a right swipe goes to
 * `leftHref` — either can be null to disable that direction.
 */
export function useSwipeNavigate<T extends HTMLElement>(
  ref: RefObject<T | null>,
  leftHref: string | null,
  rightHref: string | null
) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, leftHref, rightHref, router]);
}
