/**
 * Shared client-side subscription to `/api/agents/conversations/events`.
 *
 * Six different surfaces (sidebar recent-tasks, board, rail, file-sync,
 * app-shell tree refresh, conversation page) used to open their own
 * EventSource to this URL. Browsers cap HTTP/1.1 connections at 6 per
 * origin, so with a few surfaces mounted the SSE streams consumed the whole
 * pool and every other fetch to the app queued indefinitely — tasks
 * "stuck on Starting…", panels spinning forever. One real connection,
 * fanned out to any number of listeners, keeps the pool free.
 *
 * Listeners receive the raw `MessageEvent.data` string and keep their own
 * parsing/filtering, so call sites stay byte-for-byte compatible with what
 * they did when they owned the EventSource.
 */

type ConversationEventListener = (data: string) => void;

const listeners = new Set<ConversationEventListener>();
let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const RETRY_MS = 2000;

function ensureSource(): void {
  if (source) return;
  const es = new EventSource("/api/agents/conversations/events");
  source = es;
  es.onmessage = (msg) => {
    for (const listener of [...listeners]) {
      try {
        listener(msg.data);
      } catch {
        // One bad listener must not starve the others.
      }
    }
  };
  // EventSource reconnects on its own from transient errors (readyState
  // stays CONNECTING), but a fatal failure — e.g. an HTTP error response
  // during a dev-server recompile — closes it permanently. Recreate the
  // stream after a short delay while subscribers still exist, so one bad
  // response doesn't kill live updates for the rest of the session.
  es.onerror = () => {
    if (source !== es || es.readyState !== EventSource.CLOSED) return;
    source = null;
    if (listeners.size > 0 && retryTimer === null) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (listeners.size > 0) ensureSource();
      }, RETRY_MS);
    }
  };
}

/**
 * Subscribe to the shared conversation event stream. Opens the underlying
 * EventSource on first subscribe, closes it when the last subscriber leaves.
 * Returns an unsubscribe function (idempotent).
 */
export function subscribeConversationEvents(
  listener: ConversationEventListener
): () => void {
  listeners.add(listener);
  ensureSource();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      source?.close();
      source = null;
    }
  };
}
