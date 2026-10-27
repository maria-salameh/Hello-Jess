// A minimal stand-in for a socket.io client: tests call `receive(event, payload)` to simulate the server pushing.
import type { Socket } from "socket.io-client";

type Handler = (...args: unknown[]) => void;

export class FakeSocket {
  connected = true;
  closed = false;
  emitted: { event: string; payload: unknown }[] = [];
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler) {
    this.handlers.set(event, (this.handlers.get(event) ?? new Set()).add(handler));
    return this;
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  listenerCount(event: string) {
    return this.handlers.get(event)?.size ?? 0;
  }

  receive(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((handler) => handler(...args));
  }

  timeout() {
    return {
      emitWithAck: async (event: string, payload: unknown) => {
        this.emitted.push({ event, payload });
        return { ok: true };
      },
    };
  }

  close() {
    this.closed = true;
  }

  asSocket() {
    return this as unknown as Socket;
  }
}
