import { describe, it, expect } from "vitest";

/** Same contract as Next ReadonlyRequestCookies.get() for the sidebar cookie. */
type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

/**
 * Replicates the layout's exact logic (layout.tsx lines 46–48) so we can test it without rendering.
 * Layout: cookieStore.get("sidebar_state"); defaultSidebarOpen = sidebarValue?.value === "true"
 */
function defaultSidebarOpenFromStore(store: CookieStoreLike): boolean {
  const sidebarValue = store.get("sidebar_state");
  return sidebarValue?.value === "true";
}

describe("Layout sidebar default open (cookie as-is)", () => {
  it('returns true when sidebar_state cookie value is "true"', () => {
    // Arrange
    const cookieStore: CookieStoreLike = {
      get: (name) => (name === "sidebar_state" ? { value: "true" } : undefined),
    };

    // Act
    const result = defaultSidebarOpenFromStore(cookieStore);

    // Assert
    expect(result).toBe(true);
  });

  it("returns false when sidebar_state cookie is missing", () => {
    // Arrange
    const cookieStore: CookieStoreLike = { get: () => undefined };

    // Act
    const result = defaultSidebarOpenFromStore(cookieStore);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when sidebar_state cookie value is "false"', () => {
    // Arrange
    const cookieStore: CookieStoreLike = {
      get: (name) =>
        name === "sidebar_state" ? { value: "false" } : undefined,
    };

    // Act
    const result = defaultSidebarOpenFromStore(cookieStore);

    // Assert
    expect(result).toBe(false);
  });

  it("returns false when sidebar_state cookie value is empty string", () => {
    // Arrange
    const cookieStore: CookieStoreLike = {
      get: (name) => (name === "sidebar_state" ? { value: "" } : undefined),
    };

    // Act
    const result = defaultSidebarOpenFromStore(cookieStore);

    // Assert
    expect(result).toBe(false);
  });
});
