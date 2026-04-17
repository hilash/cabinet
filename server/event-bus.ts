import type { IncomingMessage } from "http";
import { WebSocket } from "ws";

interface EventSubscriber {
  ws: WebSocket;
  channels: Set<string>;
}

export interface EventBus {
  broadcast(channel: string, data: Record<string, unknown>): void;
  handleConnection(ws: WebSocket, req?: IncomingMessage): void;
  subscriberCount(): number;
}

// WebSocket fan-out for real-time updates to the web UI. The wildcard channel
// "*" receives everything so clients can subscribe once and filter locally.
export function createEventBus(): EventBus {
  const subscribers: EventSubscriber[] = [];

  function broadcast(channel: string, data: Record<string, unknown>): void {
    const message = JSON.stringify({ channel, ...data });
    for (const sub of subscribers) {
      if (sub.channels.has(channel) || sub.channels.has("*")) {
        if (sub.ws.readyState === WebSocket.OPEN) {
          sub.ws.send(message);
        }
      }
    }
  }

  function handleConnection(ws: WebSocket): void {
    const subscriber: EventSubscriber = { ws, channels: new Set(["*"]) };
    subscribers.push(subscriber);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.subscribe) {
          subscriber.channels.add(msg.subscribe);
        }
        if (msg.unsubscribe) {
          subscriber.channels.delete(msg.unsubscribe);
        }
      } catch {
        // ignore malformed subscriber messages
      }
    });

    ws.on("close", () => {
      const idx = subscribers.indexOf(subscriber);
      if (idx >= 0) subscribers.splice(idx, 1);
    });
  }

  return {
    broadcast,
    handleConnection,
    subscriberCount: () => subscribers.length,
  };
}
