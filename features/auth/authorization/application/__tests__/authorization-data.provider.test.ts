import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { getAuthDataForCurrentUser } from "../authorization-data.provider";
import type { AuthorizationData } from "@/lib/endatix-api/auth/types";
import { ApiErrorType, EndatixApi, ERROR_CODE } from "@/lib/endatix-api";
import { SessionError } from "@/auth";
import { AuthorizationErrorType } from "../../domain/authorization-result";

const telemetryLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}));

const unstableCacheStore = vi.hoisted(() => new Map<string, unknown>());

// Mock next/cache with a store that mimics persisting successful return values only.
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn(
    (fn: () => Promise<unknown>, keyParts?: readonly unknown[]) => {
      const cacheKey = JSON.stringify(keyParts ?? []);

      return async () => {
        if (unstableCacheStore.has(cacheKey)) {
          return unstableCacheStore.get(cacheKey);
        }

        const result = await fn();
        unstableCacheStore.set(cacheKey, result);
        return result;
      };
    },
  ),
  revalidateTag: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: telemetryLoggerMock.error,
    warn: telemetryLoggerMock.warn,
  },
}));

// Partially mock EndatixApi - keep real implementations of isAuthError, ApiErrorType, etc.
vi.mock("@/lib/endatix-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/endatix-api")>(
      "@/lib/endatix-api",
    );
  return {
    ...actual,
    EndatixApi: vi.fn(),
    ApiResult: {
      ...actual.ApiResult,
      isSuccess: vi.fn((result) => result.success !== false),
      isError: vi.fn((result) => result.success === false),
      getErrorMessage: actual.ApiResult.getErrorMessage,
    },
  };
});

describe("getAuthDataForCurrentUser", () => {
  const mockAuthorizationData: AuthorizationData = {
    userId: "user-123",
    tenantId: "tenant-456",
    roles: ["Admin"],
    permissions: ["forms.read", "forms.create"],
    isAdmin: true,
    cachedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2024-01-01T12:00:00Z",
    eTag: "etag-123",
  };

  const mockSession: Session = {
    expires: "2025-01-01T00:00:00.000Z",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: 1735689600,
    user: {
      id: "user-123",
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    unstableCacheStore.clear();
  });

  it("should return unauthenticated when session is null", async () => {
    const getAuthData = getAuthDataForCurrentUser(null);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("should return unauthenticated when session has no user", async () => {
    const sessionWithoutUser: Session = {
      ...mockSession,
      user: undefined,
    };

    const getAuthData = getAuthDataForCurrentUser(sessionWithoutUser);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("should return unauthenticated when session has no accessToken", async () => {
    const sessionWithoutToken: Session = {
      ...mockSession,
      accessToken: undefined,
    };

    const getAuthData = getAuthDataForCurrentUser(sessionWithoutToken);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("should return unauthenticated when session has error", async () => {
    const sessionWithError: Session = {
      ...mockSession,
      error: "AccessDenied" as SessionError,
    };

    const getAuthData = getAuthDataForCurrentUser(sessionWithError);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("should return unauthenticated when user has no id", async () => {
    const sessionWithoutUserId: Session = {
      ...mockSession,
      user: {
        email: "test@example.com",
      },
    };

    const getAuthData = getAuthDataForCurrentUser(sessionWithoutUserId);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("should return success with authorization data when session is valid", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const mockApiInstance = {
      auth: {
        getAuthorizationData: vi.fn().mockResolvedValue({
          success: true,
          data: mockAuthorizationData,
        }),
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockAuthorizationData);
      expect(result.data.userId).toBe("user-123");
      expect(result.data.isAdmin).toBe(true);
    }
  });

  it("should return InvalidTokenError when API returns unauthorized error", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const mockApiInstance = {
      auth: {
        getAuthorizationData: vi.fn().mockResolvedValue({
          success: false,
          error: {
            message: "Authentication required",
            type: ApiErrorType.AuthError,
            errorCode: ERROR_CODE.AUTHENTICATION_REQUIRED,
          },
        }),
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe(AuthorizationErrorType.InvalidTokenError);
      expect(result.error.message).toBe(
        "Server authentication failed. Cannot retrieve authorization data",
      );
    }
    expect(telemetryLoggerMock.warn).toHaveBeenCalledWith(
      "Authorization data rejected invalid token",
      { provider: undefined },
      "authorization",
    );
    expect(telemetryLoggerMock.error).not.toHaveBeenCalled();
  });

  it("should return error when API returns error", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const mockApiInstance = {
      auth: {
        getAuthorizationData: vi.fn().mockResolvedValue({
          success: false,
          error: {
            message: "API Error",
            type: "SERVER_ERROR",
          },
        }),
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SERVER_ERROR");
    }
    expect(telemetryLoggerMock.error).toHaveBeenCalledWith(
      "Failed to retrieve authorization data",
      undefined,
      expect.objectContaining({
        apiErrorType: "SERVER_ERROR",
      }),
      "authorization",
    );
  });

  it("should return error when API call throws", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const mockApiInstance = {
      auth: {
        getAuthorizationData: vi
          .fn()
          .mockRejectedValue(new Error("Network error")),
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SERVER_ERROR");
    }
    expect(telemetryLoggerMock.error).toHaveBeenCalledWith(
      "Authorization data fetch failed",
      expect.any(Error),
      {},
      "authorization",
    );
  });

  it("should not cache network errors and should retry on subsequent calls", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const getAuthorizationData = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        success: true,
        data: mockAuthorizationData,
      });
    const mockApiInstance = {
      auth: {
        getAuthorizationData,
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const firstResult = await getAuthData();
    const secondResult = await getAuthData();

    expect(firstResult.success).toBe(false);
    expect(secondResult.success).toBe(true);
    expect(getAuthorizationData).toHaveBeenCalledTimes(2);
    expect(unstableCacheStore.size).toBe(1);
  });

  it("should cache successful authorization data", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const getAuthorizationData = vi.fn().mockResolvedValue({
      success: true,
      data: mockAuthorizationData,
    });
    const mockApiInstance = {
      auth: {
        getAuthorizationData,
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const firstResult = await getAuthData();
    const secondResult = await getAuthData();

    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(true);
    expect(getAuthorizationData).toHaveBeenCalledTimes(1);
    expect(unstableCacheStore.size).toBe(1);
  });

  it("keeps cached permissions for at most 60 seconds", async () => {
    const { unstable_cache } = await import("next/cache");
    const { EndatixApi } = await import("@/lib/endatix-api");
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        auth: {
          getAuthorizationData: vi.fn().mockResolvedValue({
            success: true,
            data: mockAuthorizationData,
          }),
        },
      } as unknown as EndatixApi;
    });

    await getAuthDataForCurrentUser(mockSession)();

    expect(vi.mocked(unstable_cache).mock.calls.at(-1)?.[2]).toMatchObject({
      revalidate: 60,
    });
  });

  it("refetches permissions once the 60-second window rolls over, without serving the old answer", async () => {
    vi.useFakeTimers();
    try {
      const { EndatixApi } = await import("@/lib/endatix-api");
      const getAuthorizationData = vi.fn().mockResolvedValue({
        success: true,
        data: mockAuthorizationData,
      });
      vi.mocked(EndatixApi).mockImplementation(function () {
        return { auth: { getAuthorizationData } } as unknown as EndatixApi;
      });

      vi.setSystemTime(new Date("2026-11-10T10:00:05Z"));
      await getAuthDataForCurrentUser(mockSession)();
      vi.setSystemTime(new Date("2026-11-10T10:00:55Z"));
      await getAuthDataForCurrentUser(mockSession)();
      expect(getAuthorizationData).toHaveBeenCalledTimes(1);

      vi.setSystemTime(new Date("2026-11-10T10:01:05Z"));
      await getAuthDataForCurrentUser(mockSession)();
      expect(getAuthorizationData).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should use correct userId and accessToken for API call", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const mockApiInstance = {
      auth: {
        getAuthorizationData: vi.fn().mockResolvedValue({
          success: true,
          data: mockAuthorizationData,
        }),
      },
    };

    vi.mocked(EndatixApi).mockImplementation(function () {
      return mockApiInstance as unknown as EndatixApi;
    });

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    await getAuthData();

    expect(EndatixApi).toHaveBeenCalledWith("test-access-token");
    expect(mockApiInstance.auth.getAuthorizationData).toHaveBeenCalled();
  });
});
