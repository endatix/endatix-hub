import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import {
  getAuthDataForCurrentUser,
  invalidateUserAuthorizationCache,
} from "../authorization-data.provider";
import type { AuthorizationData } from "@/lib/endatix-api/auth/types";
import { EndatixApi } from "@/lib/endatix-api";
import { SessionError } from "@/auth";

// Mock next/cache
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
  revalidateTag: vi.fn(),
}));

// Mock EndatixApi
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
  ApiResult: {
    isSuccess: vi.fn((result) => result.success !== false),
    isError: vi.fn((result) => result.success === false),
  },
}));

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
    vi.clearAllMocks();
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

    vi.mocked(EndatixApi).mockImplementation(
      () => mockApiInstance as unknown as EndatixApi,
    );

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockAuthorizationData);
      expect(result.data.userId).toBe("user-123");
      expect(result.data.isAdmin).toBe(true);
    }
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

    vi.mocked(EndatixApi).mockImplementation(
      () => mockApiInstance as unknown as EndatixApi,
    );

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SERVER_ERROR");
    }
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

    vi.mocked(EndatixApi).mockImplementation(
      () => mockApiInstance as unknown as EndatixApi,
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    const result = await getAuthData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("SERVER_ERROR");
    }
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
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

    vi.mocked(EndatixApi).mockImplementation(
      () => mockApiInstance as unknown as EndatixApi,
    );

    const getAuthData = getAuthDataForCurrentUser(mockSession);
    await getAuthData();

    expect(EndatixApi).toHaveBeenCalledWith("test-access-token");
    expect(mockApiInstance.auth.getAuthorizationData).toHaveBeenCalled();
  });
});

describe("invalidateUserAuthorizationCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should invalidate cache for single userId", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({ userId: "user-123" });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-123");
  });

  it("should invalidate cache for multiple userIds", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({
      userIds: ["user-1", "user-2", "user-3"],
    });

    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-1");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-2");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-3");
  });

  it("should invalidate all user caches when allUsers is true", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({ allUsers: true });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms_all");
  });

  it("should handle multiple invalidation options", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({
      userId: "user-123",
      userIds: ["user-456", "user-789"],
      allUsers: true,
    });

    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-123");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-456");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms:user-789");
    expect(revalidateTag).toHaveBeenCalledWith("usr_prms_all");
  });

  it("should handle empty options", async () => {
    const { revalidateTag } = await import("next/cache");

    invalidateUserAuthorizationCache({});

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
