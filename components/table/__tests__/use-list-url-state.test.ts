import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListUrlState } from "../use-list-url-state";

const replace = vi.fn();
let searchParams = new URLSearchParams("page=2&search=alpha");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/forms",
  useSearchParams: () => searchParams,
}));

describe("useListUrlState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    searchParams = new URLSearchParams("page=2&search=alpha");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes search from the URL search param", () => {
    // Arrange & Act
    const { result } = renderHook(() => useListUrlState());

    // Assert
    expect(result.current.urlSearch).toBe("alpha");
    expect(result.current.search).toBe("alpha");
    expect(result.current.searchParams.get("page")).toBe("2");
  });

  it("debounces search updates into the URL and resets page to 1", () => {
    // Arrange
    const { result } = renderHook(() => useListUrlState());

    // Act
    act(() => {
      result.current.setSearch("  customer feedback  ");
    });

    // Assert
    expect(replace).not.toHaveBeenCalled();

    // Act
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    expect(replace).toHaveBeenCalledWith(
      "/forms?page=1&search=customer+feedback",
      {
        scroll: false,
      },
    );
  });

  it("supports a custom search param key and debounce interval", () => {
    // Arrange
    searchParams = new URLSearchParams("filter=open");
    const { result } = renderHook(() => useListUrlState("filter", 100));

    // Act
    act(() => {
      result.current.setSearch("closed");
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert
    expect(replace).toHaveBeenCalledWith("/forms?filter=closed&page=1", {
      scroll: false,
    });
  });

  it("clears the search param when the debounced value is empty", () => {
    // Arrange
    const { result } = renderHook(() => useListUrlState());

    // Act
    act(() => {
      result.current.setSearch("   ");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    expect(replace).toHaveBeenCalledWith("/forms?page=1", { scroll: false });
  });

  it("exposes updateUrl for immediate filter changes", () => {
    // Arrange
    const { result } = renderHook(() => useListUrlState());

    // Act
    act(() => {
      result.current.updateUrl({
        status: "enabled",
        page: "1",
      });
    });

    // Assert
    expect(replace).toHaveBeenCalledWith(
      "/forms?page=1&search=alpha&status=enabled",
      { scroll: false },
    );
  });

  it("syncs local search when the URL search value changes", () => {
    // Arrange
    const { result, rerender } = renderHook(() => useListUrlState());

    // Act
    searchParams = new URLSearchParams("search=beta");
    rerender();

    // Assert
    expect(result.current.urlSearch).toBe("beta");
    expect(result.current.search).toBe("beta");
  });
});
