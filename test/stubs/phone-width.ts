import { vi } from "vitest";

/**
 * A 375 px viewport for `matchMedia`: `max-width` queries match, `min-width` ones do not, so
 * `ResponsivePanel` renders its Drawer. Call it in `beforeEach`: `unstubGlobals` undoes it.
 */
export function stubPhoneWidth(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}
