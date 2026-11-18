import { onTestFinished, vi } from "vitest";

/**
 * jsdom has no pointer capture; a Radix Select calls `hasPointerCapture` and
 * `releasePointerCapture` on its trigger. Call it in `beforeEach` or the test: the stubs are
 * removed when the test finishes.
 */
export function stubPointerCapture(): void {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  onTestFinished(() => {
    const prototype = Element.prototype as Partial<Element>;
    delete prototype.hasPointerCapture;
    delete prototype.releasePointerCapture;
  });
}
