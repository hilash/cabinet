import { useEffect, useRef } from "react";

/**
 * Run `callback` on `intervalMs` ticks, but only while the document is
 * visible. When the tab is hidden the interval skips firing; when it
 * becomes visible again the callback runs once immediately (catch-up)
 * and the regular cadence resumes.
 *
 * Why this exists: Cabinet polls several endpoints on short intervals
 * (overview, git status, agent status, activity feed). With multiple
 * tabs open against the same dev origin, the per-tab pollers plus
 * Next.js HMR sockets quickly saturate the browser's per-origin
 * HTTP/1.1 connection budget (~6 connections per host), and any
 * foreground tab's new requests queue forever as "Pending, 0 KB". By
 * silencing background tabs' polling we leave the foreground tab's
 * budget free.
 *
 * Companion to the pattern already in `tree-view.tsx` (`if
 * (document.visibilityState === "visible")` inside the interval body),
 * generalized so every poller picks it up consistently.
 */
export function useVisibleInterval(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: { fireOnMount?: boolean } = { fireOnMount: true }
): void {
  // Pin the latest callback in a ref so the interval effect can stay
  // mounted across renders without restarting each time the caller
  // passes a new closure. Updated in an effect, not during render
  // (react-hooks/refs).
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      void cbRef.current();
    };

    if (options.fireOnMount) run();

    const interval = window.setInterval(run, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, options.fireOnMount]);
}
