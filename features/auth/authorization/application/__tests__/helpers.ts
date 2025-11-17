import { vi } from "vitest";
import type { Session } from "next-auth";

import type { AuthorizationData } from "@/lib/endatix-api/auth/types";
import {
  AuthorizationResult,
  type GetAuthDataResult,
} from "../../domain/authorization-result";

type SessionOverrides = Partial<Session> & {
  user?: Partial<NonNullable<Session["user"]>>;
};

export function createMockSession(overrides: SessionOverrides = {}): Session {
  return {
    expires: "2025-01-01T00:00:00.000Z",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 1735689600,
    user: {
      id: "user-123",
      email: "user@example.com",
      ...overrides.user,
    },
    ...overrides,
  };
}

export function createTestAuthorizationData(
  overrides: Partial<AuthorizationData> = {},
): AuthorizationData {
  return {
    userId: "user-123",
    tenantId: "tenant-456",
    roles: [],
    permissions: [],
    isAdmin: false,
    cachedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2024-01-01T12:00:00Z",
    eTag: "etag-123",
    ...overrides,
  };
}

export function createAuthSuccess(
  overrides: Partial<AuthorizationData> = {},
): GetAuthDataResult {
  return AuthorizationResult.success(createTestAuthorizationData(overrides));
}

export function createAuthError(): GetAuthDataResult {
  return AuthorizationResult.error();
}

export function createAuthForbidden(message = "Forbidden"): GetAuthDataResult {
  return AuthorizationResult.forbidden(message);
}

export function mockRedirect() {
  const redirect = vi.fn(() => {
    const error = new Error("redirect");
    (error as Error & { digest?: string }).digest = "NEXT_REDIRECT";
    throw error;
  });
  return redirect;
}
