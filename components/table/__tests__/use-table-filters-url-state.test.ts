import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTableFiltersUrlState } from "../use-table-filters-url-state";

const replace = vi.fn();
let searchParams = new URLSearchParams("page=2&search=alpha");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/data-lists",
  useSearchParams: () => searchParams,
}));

const FILTER_KEYS = ["search", "hasLocale"] as const;

describe("useTableFiltersUrlState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    searchParams = new URLSearchParams("page=2&search=alpha");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes values from the URL for every key", () => {
    // Arrange & Act
    const { result } = renderHook(() => useTableFiltersUrlState(FILTER_KEYS));

    // Assert
    expect(result.current.values).toEqual({ search: "alpha", hasLocale: "" });
  });

  it("coalesces edits to two fields into a single updateUrl call", () => {
    // Arrange
    const { result } = renderHook(() => useTableFiltersUrlState(FILTER_KEYS));

    // Act — edit both fields within the debounce window
    act(() => {
      result.current.setValue("search", "cities");
    });
    act(() => {
      result.current.setValue("hasLocale", "es");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert — one navigation, both values present (neither dropped)
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(
      "/data-lists?page=1&search=cities&hasLocale=es",
      { scroll: false },
    );
  });

  it("resets page to 1 when a filter commits", () => {
    // Arrange
    const { result } = renderHook(() => useTableFiltersUrlState(FILTER_KEYS));

    // Act
    act(() => {
      result.current.setValue("search", "cities");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    const [href] = replace.mock.calls[0];
    expect(href).toContain("page=1");
  });

  it("clears a filter when the committed value is empty", () => {
    // Arrange
    const { result } = renderHook(() => useTableFiltersUrlState(FILTER_KEYS));

    // Act
    act(() => {
      result.current.setValue("search", "   ");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert
    expect(replace).toHaveBeenCalledWith("/data-lists?page=1", {
      scroll: false,
    });
  });

  it("does not navigate when nothing changed", () => {
    // Arrange
    renderHook(() => useTableFiltersUrlState(FILTER_KEYS));

    // Act
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Assert
    expect(replace).not.toHaveBeenCalled();
  });

  it("resyncs local values when the URL changes from outside", () => {
    // Arrange
    const { result, rerender } = renderHook(() =>
      useTableFiltersUrlState(FILTER_KEYS),
    );

    // Act
    searchParams = new URLSearchParams("search=beta&hasLocale=fr");
    rerender();

    // Assert
    expect(result.current.values).toEqual({ search: "beta", hasLocale: "fr" });
  });
});
