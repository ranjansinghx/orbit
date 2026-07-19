"use client";

import { RefObject, useEffect, useRef, useState } from "react";

const THRESHOLD = 70; // px of downward drag needed to trigger a refresh
const MAX_PULL = 110;

/**
 * Touch-driven pull-to-refresh for a scrollable container. Only engages
 * when the container is already scrolled to the top — otherwise an
 * ordinary downward swipe mid-feed would be hijacked.
 * Returns `pullDistance` (0..MAX_PULL, for driving an indicator's
 * transform/opacity) and `refreshing`.
 */
export function usePullToRefresh<T extends HTMLElement>(
  ref: RefObject<T>,
  onRefresh: () => Promise<void> | void
) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        dragging.current = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Only take over the gesture once it's clearly a downward pull at
      // the top of the list — this lets normal scrolling pass through.
      if (el!.scrollTop <= 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, MAX_PULL));
      }
    }

    async function onTouchEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      startY.current = null;
      setPullDistance((current) => {
        if (current >= THRESHOLD) {
          setRefreshing(true);
          Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
        }
        return 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, onRefresh]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}

/** Same gesture as usePullToRefresh, but for a page that scrolls the
 * window/document rather than an internal container (checks
 * window.scrollY instead of a ref's scrollTop). */
export function useWindowPullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        dragging.current = true;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    }
    async function onTouchEnd() {
      if (!dragging.current) return;
      dragging.current = false;
      startY.current = null;
      setPullDistance((current) => {
        if (current >= THRESHOLD) {
          setRefreshing(true);
          Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
        }
        return 0;
      });
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
