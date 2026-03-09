import { vi } from "vitest";

/**
 * Sets up a global fetch mock and returns it. Call in beforeEach or at the top of a test file.
 * Use vi.mocked(fetch) for type-safe assertions. Remember to clear in beforeEach if needed.
 */
export function setupFetchMock(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
