import "@testing-library/jest-dom/vitest";

// Mock EventSource for SSE-based hooks (useLiveSensors, useLiveAlertCount)
if (typeof globalThis.EventSource === "undefined") {
  class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;
    readyState = 0;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    url: string;
    private listeners: Map<string, ((event: Event) => void)[]> = new Map();

    constructor(url: string) {
      this.url = url;
      this.readyState = MockEventSource.OPEN;
      // Emit "connected" event asynchronously
      setTimeout(() => {
        const handlers = this.listeners.get("connected");
        if (handlers) {
          for (const handler of handlers) {
            handler(new Event("connected"));
          }
        }
      }, 0);
    }
    addEventListener(type: string, handler: (event: Event) => void) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      this.listeners.get(type)!.push(handler);
    }
    removeEventListener(type: string, handler: (event: Event) => void) {
      const handlers = this.listeners.get(type);
      if (handlers) {
        this.listeners.set(type, handlers.filter((h) => h !== handler));
      }
    }
    close() {
      this.readyState = MockEventSource.CLOSED;
    }
  }

  // @ts-expect-error - assigning mock to global
  globalThis.EventSource = MockEventSource;
}
