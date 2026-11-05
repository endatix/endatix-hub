import { vi } from "vitest";

export class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/**
 * jsdom has no ResizeObserver; Radix, cmdk and SurveyJS construct one.
 * Call it in `beforeEach`: `unstubGlobals` removes it before every test.
 */
export function stubResizeObserver(): void {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
}
