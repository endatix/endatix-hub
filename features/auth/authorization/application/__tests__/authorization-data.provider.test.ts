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

// React's cache() memoizes only under the react-server condition. Mimic it with a
// store that a test clears to start a new server request.
const requestCacheStore = vi.hoisted(() => new Map<string, unknown>());
const startNewRequest = () => requestCacheStore.clear();

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
      const scope = Symbol("cached-function");
      return (...args: A): R => {
        const key = `${String(scope)}:${JSON.stringify(args)}`;
        if (!requestCacheStore.has(key)) {
          requestCacheStore.set(key, fn(...args));
        }
        return requestCacheStore.get(key) as R;
      };
    },
  };
});

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
    startNewRequest();
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

  it("retries on the next request after a failed fetch", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const getAuthorizationData = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        success: true,
        data: mockAuthorizationData,
      });
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { auth: { getAuthorizationData } } as unknown as EndatixApi;
    });

    const firstResult = await getAuthDataForCurrentUser(mockSession)();
    startNewRequest();
    const secondResult = await getAuthDataForCurrentUser(mockSession)();

    expect(firstResult.success).toBe(false);
    expect(secondResult.success).toBe(true);
    expect(getAuthorizationData).toHaveBeenCalledTimes(2);
  });

  it("fetches authorization data once per request however many checks read it", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const getAuthorizationData = vi.fn().mockResolvedValue({
      success: true,
      data: mockAuthorizationData,
    });
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { auth: { getAuthorizationData } } as unknown as EndatixApi;
    });

    const results = await Promise.all([
      getAuthDataForCurrentUser(mockSession)(),
      getAuthDataForCurrentUser(mockSession)(),
      getAuthDataForCurrentUser(mockSession)(),
    ]);

    expect(results.every((result) => result.success)).toBe(true);
    expect(getAuthorizationData).toHaveBeenCalledTimes(1);
  });

  it("shows a role change on the next request", async () => {
    const { EndatixApi } = await import("@/lib/endatix-api");
    const withoutCreate: AuthorizationData = {
      ...mockAuthorizationData,
      roles: ["Viewer"],
      permissions: ["forms.read"],
      isAdmin: false,
    };
    const getAuthorizationData = vi
      .fn()
      .mockResolvedValueOnce({ success: true, data: mockAuthorizationData })
      .mockResolvedValueOnce({ success: true, data: withoutCreate });
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { auth: { getAuthorizationData } } as unknown as EndatixApi;
    });

    const before = await getAuthDataForCurrentUser(mockSession)();
    startNewRequest();
    const after = await getAuthDataForCurrentUser(mockSession)();

    expect(before.success && before.data.permissions).toContain("forms.create");
    expect(after.success && after.data.permissions).not.toContain(
      "forms.create",
    );
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
