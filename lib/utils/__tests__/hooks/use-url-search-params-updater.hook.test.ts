import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUrlSearchParamsUpdater } from "../../hooks/use-url-search-params-updater.hook";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/settings/organization/users",
  useSearchParams: () => new URLSearchParams("page=2&search=alpha"),
}));

describe("useUrlSearchParamsUpdater", () => {
  it("merges updates into the current URL and replaces without scrolling", () => {
    // Arrange
    const { result } = renderHook(() => useUrlSearchParamsUpdater());

    // Act
    act(() => {
      result.current.updateUrl({
        search: "beta",
        role: "Admin",
        page: "1",
      });
    });

    // Assert
    expect(replace).toHaveBeenCalledWith(
      "/settings/organization/users?page=1&search=beta&role=Admin",
      { scroll: false },
    );
  });

  it("removes params when values are null", () => {
    // Arrange
    const { result } = renderHook(() => useUrlSearchParamsUpdater());

    // Act
    act(() => {
      result.current.updateUrl({
        search: null,
        page: null,
      });
    });

    // Assert
    expect(replace).toHaveBeenCalledWith("/settings/organization/users", {
      scroll: false,
    });
  });
});
