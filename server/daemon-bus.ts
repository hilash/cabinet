import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export type DaemonAckEventName = `daemon:ack:${string}`;

export interface PtyCreateRequest {
  id?: string;
  providerId?: string;
  prompt?: string;
  cwd?: string;
  timeoutSeconds?: number;
}

export interface PtyCreateRequestEvent extends PtyCreateRequest {
  requestId: string;
  replyTo: DaemonAckEventName;
}

export interface PtyCreatedEvent {
  requestId: string;
  sessionId: string;
  pid: number | null;
  existing?: boolean;
  error?: string;
}

export interface PtyExitEvent {
  sessionId: string;
  pid: number | null;
  exitCode: number;
}

type DaemonBusEvents = {
  "pty:create-request": PtyCreateRequestEvent;
  "pty:created": PtyCreatedEvent;
  "pty:exit": PtyExitEvent;
} & {
  [key in DaemonAckEventName]: PtyCreatedEvent;
};

type DaemonRequestPayloads = {
  "pty:create-request": PtyCreateRequest;
};

type DaemonRequestResponses = {
  "pty:create-request": PtyCreatedEvent;
};

type RequestEventPayloads = {
  "pty:create-request": PtyCreateRequestEvent;
};

type Listener<T> = (payload: T) => void;

function getAckEventName(
  eventName: keyof DaemonRequestPayloads,
  requestId: string,
): DaemonAckEventName {
  return `daemon:ack:${String(eventName)}:${requestId}`;
}

class DaemonBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  on<K extends keyof DaemonBusEvents>(
    eventName: K,
    listener: Listener<DaemonBusEvents[K]>,
  ): this;
  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }

  once<K extends keyof DaemonBusEvents>(
    eventName: K,
    listener: Listener<DaemonBusEvents[K]>,
  ): this;
  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(eventName, listener);
  }

  off<K extends keyof DaemonBusEvents>(
    eventName: K,
    listener: Listener<DaemonBusEvents[K]>,
  ): this;
  off(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.off(eventName, listener);
  }

  emit<K extends keyof DaemonBusEvents>(
    eventName: K,
    payload: DaemonBusEvents[K],
  ): boolean;
  emit(eventName: string | symbol, payload: unknown): boolean {
    return super.emit(eventName, payload);
  }

  request<K extends keyof DaemonRequestPayloads>(
    eventName: K,
    payload: DaemonRequestPayloads[K],
    options: { timeoutMs?: number } = {},
  ): Promise<DaemonRequestResponses[K]> {
    const requestId = randomUUID();
    const replyTo = getAckEventName(eventName, requestId);
    const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const onAck = (response: DaemonRequestResponses[K]) => {
        clearTimeout(timeoutHandle);
        resolve(response);
      };

      const timeoutHandle = setTimeout(() => {
        this.off(replyTo, onAck as Listener<DaemonBusEvents[typeof replyTo]>);
        reject(new Error(`daemonBus request timed out for ${String(eventName)} after ${timeoutMs}ms`));
      }, timeoutMs);

      this.once(replyTo, onAck as Listener<DaemonBusEvents[typeof replyTo]>);

      const handled = this.emit(
        eventName,
        { ...payload, requestId, replyTo } as RequestEventPayloads[K],
      );

      if (!handled) {
        clearTimeout(timeoutHandle);
        this.off(replyTo, onAck as Listener<DaemonBusEvents[typeof replyTo]>);
        reject(new Error(`daemonBus has no handler for ${String(eventName)}`));
      }
    });
  }
}

export const daemonBus = new DaemonBus();
