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
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    vi.advanceTimersByTime(100);

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("debounces resize events with default delay", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();
    handleResize();
    handleResize();

    expect(onResize).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("uses custom delay when provided", () => {
    const onResize = vi.fn();
    const customDelay = 250;

    renderHook(() => useDebouncedResize({ onResize, delay: customDelay }));

    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    vi.advanceTimersByTime(100);
    expect(onResize).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("clears previous timeout when new resize occurs", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize }));

    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];

    handleResize();
    vi.advanceTimersByTime(50);
    handleResize();
    vi.advanceTimersByTime(50);

    expect(onResize).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("adds and removes resize listener on mount/unmount", () => {
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

  it("cleans up pending timeout on unmount", () => {
    const onResize = vi.fn();

    const { unmount } = renderHook(() => useDebouncedResize({ onResize }));

    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    unmount();

    vi.advanceTimersByTime(200);

    expect(onResize).not.toHaveBeenCalled();
  });

  it("handles zero delay", () => {
    const onResize = vi.fn();

    renderHook(() => useDebouncedResize({ onResize, delay: 0 }));

    onResize.mockClear();

    const handleResize = mockAddEventListener.mock.calls[0][1];
    handleResize();

    vi.advanceTimersByTime(0);
    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
