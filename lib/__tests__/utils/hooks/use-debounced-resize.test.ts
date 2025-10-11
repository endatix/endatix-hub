import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useDebouncedResize } from "../../../utils/hooks/use-debounced-resize";

// Mock window.addEventListener and window.removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

describe("useDebouncedResize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onResize immediately on mount", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    // The effect runs after mount and sets up a timeout with default delay
    vi.advanceTimersByTime(100);

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("should debounce resize events with default delay", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    // Clear the initial call
    onResize.mockClear();

    // Simulate multiple rapid resize events
    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();
    handleResize();
    handleResize();

    // Should not be called immediately
    expect(onResize).not.toHaveBeenCalled();

    // Fast-forward by default delay (100ms)
    vi.advanceTimersByTime(100);

    // Should be called only once after debounce
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("should use custom delay when provided", () => {
    const onResize = vi.fn();
    const customDelay = 250;

    renderHook(() => useDebouncedResize({ onResize, delay: customDelay }));

    // Clear the initial call
    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    // Should not be called before custom delay
    vi.advanceTimersByTime(100);
    expect(onResize).not.toHaveBeenCalled();

    // Should be called after custom delay
    vi.advanceTimersByTime(150);
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("should clear previous timeout when new resize event occurs", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    // Clear the initial call
    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];

    // First resize event
    handleResize();
    vi.advanceTimersByTime(50);

    // Second resize event should clear the first timeout
    handleResize();
    vi.advanceTimersByTime(50);

    // Should not be called yet
    expect(onResize).not.toHaveBeenCalled();

    // Complete the delay
    vi.advanceTimersByTime(50);

    // Should be called only once (from the second event)
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("should add and remove event listeners correctly", () => {
    const onResize = vi.fn();

    const { unmount } = renderHook(() => useDebouncedResize({ onResize }));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("should clean up timeout on unmount", () => {
    const onResize = vi.fn();

    const { unmount } = renderHook(() => useDebouncedResize({ onResize }));

    // Clear the initial call
    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    // Unmount before timeout completes
    unmount();

    // Fast-forward time
    vi.advanceTimersByTime(200);

    // Should not be called after unmount
    expect(onResize).not.toHaveBeenCalled();
  });

  it("should handle multiple rapid resize events correctly", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    // Clear the initial call
    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];

    // Simulate rapid resize events
    for (let i = 0; i < 10; i++) {
      handleResize();
      vi.advanceTimersByTime(10);
    }

    // Should not be called during rapid events
    expect(onResize).not.toHaveBeenCalled();

    // Complete the delay after last event
    vi.advanceTimersByTime(100);

    // Should be called only once
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("should work with zero delay", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize, delay: 0 }));

    // Clear the initial call
    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    // Should be called immediately with zero delay
    vi.advanceTimersByTime(0);
    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
