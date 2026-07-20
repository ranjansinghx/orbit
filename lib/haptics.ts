/** Tiny wrapper around the Vibration API — silently no-ops on browsers/
 * devices that don't support it (desktop, iOS Safari), so it's always
 * safe to call. Patterns are short and light on purpose. */
export function haptic(pattern: "tap" | "success" | "like" = "tap") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<string, number | number[]> = {
    tap: 8,
    like: 12,
    success: [10, 40, 10],
  };
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Vibration API can throw in some embedded/iframe contexts — ignore.
  }
}
