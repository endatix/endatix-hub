import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDebouncedResize } from "../../hooks/use-debounced-resize.hook";

const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe("useDebouncedResize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    Object.defineProperty(window, "addEventListener", {
      value: mockAddEventListener,
      writable: true,
    });
    Object.defineProperty(window, "removeEventListener", {
      value: mockRemoveEventListener,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onResize after default delay on mount", () => {
    // Arrange
    const onResize = vi.fn();

    // Act
    renderHook(() => useDebouncedResize({ onResize }));
    vi.advanceTimersByTime(100);

    // Assert
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("debounces resize events with default delay", () => {
    // Arrange
    const onResize = vi.fn();
    renderHook(() => useDebouncedResize({ onResize }));
    onResize.mockClear();
    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Act
    handleResize();
    handleResize();
    handleResize();

    // Assert
    expect(onResize).not.toHaveBeenCalled();

    // Act
    vi.advanceTimersByTime(100);

    // Assert
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("uses custom delay when provided", () => {
    // Arrange
    const onResize = vi.fn();
    const customDelay = 250;
    renderHook(() => useDebouncedResize({ onResize, delay: customDelay }));
    onResize.mockClear();
    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Act
    handleResize();

    // Assert
    vi.advanceTimersByTime(100);
    expect(onResize).not.toHaveBeenCalled();

    // Act
    vi.advanceTimersByTime(150);

    // Assert
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("clears previous timeout when new resize occurs", () => {
    // Arrange
    const onResize = vi.fn();
    renderHook(() => useDebouncedResize({ onResize }));
    onResize.mockClear();
    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Act
    handleResize();
    vi.advanceTimersByTime(50);
    handleResize();
    vi.advanceTimersByTime(50);

    // Assert
    expect(onResize).not.toHaveBeenCalled();

    // Act
    vi.advanceTimersByTime(50);

    // Assert
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("adds and removes resize listener on mount/unmount", () => {
    // Arrange
    const onResize = vi.fn();

    // Act
    const { unmount } = renderHook(() => useDebouncedResize({ onResize }));

    // Assert
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );

    // Act
    unmount();

    // Assert
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("cleans up pending timeout on unmount", () => {
    // Arrange
    const onResize = vi.fn();
    const { unmount } = renderHook(() => useDebouncedResize({ onResize }));
    onResize.mockClear();
    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Act
    handleResize();
    unmount();
    vi.advanceTimersByTime(200);

    // Assert
    expect(onResize).not.toHaveBeenCalled();
  });

  it("handles zero delay", () => {
    // Arrange
    const onResize = vi.fn();
    renderHook(() => useDebouncedResize({ onResize, delay: 0 }));
    onResize.mockClear();
    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Act
    handleResize();
    vi.advanceTimersByTime(0);

    // Assert
    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
