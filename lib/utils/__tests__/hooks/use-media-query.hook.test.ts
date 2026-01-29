import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useMediaQuery } from "../../hooks/use-media-query.hook";

describe("useMediaQuery", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns false when media does not match", () => {
    // Arrange
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Act
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    // Assert
    expect(result.current).toBe(false);
  });

  it("returns true when media matches", () => {
    // Arrange
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Act
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    // Assert
    expect(result.current).toBe(true);
  });

  it("calls matchMedia with the given query", () => {
    // Arrange
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    // Act
    renderHook(() => useMediaQuery("(prefers-color-scheme: dark)"));

    // Assert
    expect(matchMediaMock).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("subscribes to change events and cleans up on unmount", () => {
    // Arrange
    const addEventListenerMock = vi.fn();
    const removeEventListenerMock = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((_query: string) => ({
      matches: false,
      media: _query,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    // Act
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    // Assert
    expect(addEventListenerMock).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    // Act
    unmount();

    // Assert
    expect(removeEventListenerMock).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
