import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// jsdom has no canvas or ResizeObserver, so give the graph something harmless to draw on
const context = new Proxy(
  { measureText: (text: string) => ({ width: text.length * 6 }) } as Record<string, unknown>,
  {
    get: (target, key: string) => target[key] ?? (() => undefined),
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  },
);
HTMLCanvasElement.prototype.getContext = (() =>
  context) as unknown as typeof HTMLCanvasElement.prototype.getContext;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
