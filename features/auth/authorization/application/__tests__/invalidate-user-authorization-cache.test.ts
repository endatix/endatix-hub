import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateUserAuthorizationCache } from "../authorization-data.provider";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
    warn: telemetryLoggerMock.warn,
  },
}));

beforeEach(() => {
  telemetryLoggerMock.warn.mockClear();
});

describe("invalidateUserAuthorizationCache", () => {
  it("logs and carries on when clearing the cache fails, so a completed change is not reported as failed", async () => {
    const { revalidateTag } = await import("next/cache");
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });

    expect(() =>
      invalidateUserAuthorizationCache({ allUsers: true }),
    ).not.toThrow();
    expect(telemetryLoggerMock.warn).toHaveBeenCalled();
  });

  it("expires entries at once, so the next page load reads fresh permissions", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({ userId: "user-123" });

    expect(revalidateTag).not.toHaveBeenCalledWith(expect.anything(), "max");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-123", {
      expire: 0,
    });
  });

  it("should invalidate cache for single userId", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({ userId: "user-123" });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-123", {
      expire: 0,
    });
  });

  it("should invalidate cache for multiple userIds", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({
      userIds: ["user-1", "user-2", "user-3"],
    });

    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-1", {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-2", {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-3", {
      expire: 0,
    });
  });

  it("should invalidate all user caches when allUsers is true", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({ allUsers: true });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms_all", { expire: 0 });
  });

  it("should handle multiple invalidation options", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({
      userId: "user-123",
      userIds: ["user-456", "user-789"],
      allUsers: true,
    });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-123", {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-456", {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-789", {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms_all", { expire: 0 });
  });

  it("should handle empty options", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({});

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
