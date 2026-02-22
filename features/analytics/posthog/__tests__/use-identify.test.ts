import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PostHog, usePostHog } from "posthog-js/react";
import { useIdentify, useSessionIdentity } from "../client/hooks/use-identify";
import type { Session } from "next-auth";

const mockIdentify = vi.fn();
const mockReset = vi.fn();
const mockAlias = vi.fn();

vi.mock("posthog-js/react", () => ({
  usePostHog: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {},
}));

describe("useIdentify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePostHog).mockReturnValue({
      identify: mockIdentify,
      reset: mockReset,
      alias: mockAlias,
    } as unknown as PostHog);
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
    });
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    Object.defineProperty(global, "crypto", {
      value: { randomUUID: () => "uuid-123" },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("identify", () => {
    it("should call posthog.identify with distinctId and properties", () => {
      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.identify("user-1", { plan: "pro" });
      });

      expect(mockIdentify).toHaveBeenCalledWith("user-1", { plan: "pro" });
    });

    it("should do nothing when posthog is null", () => {
      vi.mocked(usePostHog).mockReturnValue(null);
      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.identify("user-1");
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });
  });

  describe("identifyLoggedInUser", () => {
    it("should identify with email and call alias when anonymous id exists", () => {
      const getItem = vi.fn().mockReturnValue("anon_abc");
      Object.defineProperty(global, "localStorage", {
        value: { getItem, setItem: vi.fn(), removeItem: vi.fn() },
        writable: true,
      });

      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.identifyLoggedInUser("user@example.com");
      });

      expect(mockIdentify).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({
          isLoggedIn: true,
          email: "user@example.com",
        }),
      );
      expect(mockAlias).toHaveBeenCalledWith("user@example.com", "anon_abc");
    });

    it("should not call alias when no anonymous id stored", () => {
      const getItem = vi.fn().mockReturnValue(null);
      Object.defineProperty(global, "localStorage", {
        value: { getItem, setItem: vi.fn(), removeItem: vi.fn() },
        writable: true,
      });

      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.identifyLoggedInUser("user@example.com");
      });

      expect(mockIdentify).toHaveBeenCalled();
      expect(mockAlias).not.toHaveBeenCalled();
    });

    it("should do nothing when email is empty", () => {
      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.identifyLoggedInUser("");
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });
  });

  describe("resetIdentity", () => {
    it("should remove stored id, call posthog.reset, and return new anonymous id", () => {
      const removeItem = vi.fn();
      const setItem = vi.fn();
      Object.defineProperty(global, "localStorage", {
        value: { getItem: vi.fn(), setItem, removeItem },
        writable: true,
      });

      const { result } = renderHook(() => useIdentify());

      let newId: string | null = null;
      act(() => {
        newId = result.current.resetIdentity();
      });

      expect(removeItem).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
      expect(newId).toMatch(/^anon_/);
      expect(setItem).toHaveBeenCalledWith(expect.any(String), newId);
    });
  });

  describe("handleSession", () => {
    it("should identify logged-in user by email when session has user.email", () => {
      const getItem = vi.fn().mockReturnValue(null);
      Object.defineProperty(global, "localStorage", {
        value: { getItem, setItem: vi.fn(), removeItem: vi.fn() },
        writable: true,
      });

      const session: Session = {
        user: { email: "logged@example.com", name: "User" },
        expires: "2026-12-31",
      };

      const { result } = renderHook(() => useIdentify());

      let active: boolean | undefined;
      act(() => {
        active = result.current.handleSession(session);
      });

      expect(active).toBe(true);
      expect(mockIdentify).toHaveBeenCalledWith(
        "logged@example.com",
        expect.objectContaining({
          isLoggedIn: true,
          email: "logged@example.com",
        }),
      );
    });

    it("should identify anonymous when session is null", () => {
      const getItem = vi.fn().mockReturnValue(null);
      const setItem = vi.fn();
      Object.defineProperty(global, "localStorage", {
        value: { getItem, setItem, removeItem: vi.fn() },
        writable: true,
      });

      const { result } = renderHook(() => useIdentify());

      act(() => {
        result.current.handleSession(null);
      });

      expect(mockIdentify).toHaveBeenCalledWith(
        expect.stringMatching(/^anon_/),
        { isLoggedIn: false },
      );
    });

    it("should return false when posthog is null", () => {
      vi.mocked(usePostHog).mockReturnValue(null);
      const { result } = renderHook(() => useIdentify());

      let active: boolean | undefined;
      act(() => {
        active = result.current.handleSession({
          user: { email: "a@b.com" },
          expires: "",
        });
      });

      expect(active).toBe(false);
    });
  });
});

describe("useSessionIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePostHog).mockReturnValue({
      identify: mockIdentify,
      reset: mockReset,
      alias: mockAlias,
    } as unknown as PostHog);
    Object.defineProperty(global, "window", { value: {}, writable: true });
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
    Object.defineProperty(global, "crypto", {
      value: { randomUUID: () => "uuid-session" },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should call handleSession when session is provided", () => {
    const session: Session = {
      user: { email: "effect@example.com" },
      expires: "2026-12-31",
    };

    renderHook(() => useSessionIdentity(session));

    expect(mockIdentify).toHaveBeenCalledWith(
      "effect@example.com",
      expect.objectContaining({
        isLoggedIn: true,
        email: "effect@example.com",
      }),
    );
  });

  it("should not call identify when posthog is null", () => {
    vi.mocked(usePostHog).mockReturnValue(null);

    renderHook(() =>
      useSessionIdentity({
        user: { email: "x@y.com" },
        expires: "",
      }),
    );

    expect(mockIdentify).not.toHaveBeenCalled();
  });
});
