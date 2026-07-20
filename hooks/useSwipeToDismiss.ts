"use client";

import { useRef, useState } from "react";

const DISMISS_THRESHOLD = 120; // px of downward drag needed to dismiss
const VELOCITY_THRESHOLD = 0.5; // px/ms — a fast flick dismisses even if short

/**
 * Drag-down-to-dismiss for a bottom sheet. Attach the returned handlers to
 * the sheet's drag handle (or the sheet itself). `translateY` drives the
 * sheet's transform while dragging — rubber-bands back to 0 if released
 * short of the threshold, or calls onDismiss if it clears it.
 */
export function useSwipeToDismiss(onDismiss: () => void) {
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setTranslateY(delta);
  }

  function onTouchEnd() {
    setDragging(false);
    const elapsed = Date.now() - startTime.current || 1;
    const velocity = translateY / elapsed;
    if (translateY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onDismiss();
    }
    setTranslateY(0);
  }

  return {
    translateY,
    dragging,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
