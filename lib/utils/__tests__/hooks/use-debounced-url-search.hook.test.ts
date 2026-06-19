import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedUrlSearch } from "../../hooks/use-debounced-url-search.hook";

describe("useDebouncedUrlSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs local search state when the URL search value changes", () => {
    // Arrange
    const updateUrl = vi.fn();
    const { result, rerender } = renderHook(
      (urlSearch: string) =>
        useDebouncedUrlSearch({
          urlSearch,
          updateUrl,
        }),
      { initialProps: "alpha" },
    );

    // Act
    rerender("beta");

    // Assert
    expect(result.current.search).toBe("beta");
  });

  it("debounces URL updates and resets page to 1", () => {
    // Arrange
    const updateUrl = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedUrlSearch({
        urlSearch: "",
        updateUrl,
      }),
    );

    // Act
    act(() => {
      result.current.setSearch("  tenant admin  ");
    });

    // Assert
    expect(updateUrl).not.toHaveBeenCalled();

    // Act
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      search: "tenant admin",
      page: "1",
    });
  });

  it("clears the search param when the debounced value is empty", () => {
    // Arrange
    const updateUrl = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedUrlSearch({
        urlSearch: "existing",
        updateUrl,
      }),
    );

    // Act
    act(() => {
      result.current.setSearch("   ");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      page: "1",
    });
  });
});
