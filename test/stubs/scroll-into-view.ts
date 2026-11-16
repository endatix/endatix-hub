import { onTestFinished, vi } from "vitest";

/**
 * jsdom has no `Element.prototype.scrollIntoView`; cmdk calls it on the active item.
 * Call it in `beforeEach` or the test: the stub is removed when the test finishes.
 */
export function stubScrollIntoView(): void {
  Element.prototype.scrollIntoView = vi.fn();
  onTestFinished(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });
}
