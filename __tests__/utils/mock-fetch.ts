import { vi } from "vitest";

/**
 * Sets up a global fetch mock and returns it. Call in beforeEach: `unstubGlobals` removes the
 * stub after every test, so a call at the top of a test file is gone before the tests run.
 * Use vi.mocked(fetch) for type-safe assertions.
 */
export function setupFetchMock(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
