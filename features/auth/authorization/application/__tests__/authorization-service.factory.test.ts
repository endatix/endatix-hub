import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../authorization-data.provider", () => ({
  getAuthDataForCurrentUser: vi.fn(),
}));

vi.mock("../authorization-checkers", () => ({
  checkPermissionFactory: vi.fn(),
  checkAnyPermissionFactory: vi.fn(),
  checkAllPermissionsFactory: vi.fn(),
  checkIsAdminFactory: vi.fn(),
  checkIsInRoleFactory: vi.fn(),
}));

vi.mock("../authorization-guards", () => ({
  requirePermissionFactory: vi.fn(),
  requireAnyPermissionFactory: vi.fn(),
  requireAllPermissionsFactory: vi.fn(),
  requireHubAccessFactory: vi.fn(),
  requireAdminAccessFactory: vi.fn(),
  requireRoleFactory: vi.fn(),
  requirePlatformAdminFactory: vi.fn(),
}));

import { createAuthorizationService } from "../authorization-service.factory";
import { auth } from "@/auth";
import { getAuthDataForCurrentUser } from "../authorization-data.provider";
import * as checkerFactories from "../authorization-checkers";
import * as guardFactories from "../authorization-guards";
import { NextMiddleware } from "next/server";

describe("createAuthorizationService", () => {
  const mockSession: Session = {
    expires: "2025-01-01T00:00:00.000Z",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: 123,
    user: {
      id: "user-123",
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupAuthorizationServiceFns() {
    const getAuthData = vi.fn();
    vi.mocked(getAuthDataForCurrentUser).mockReturnValue(getAuthData);

    const checkPermission = vi.fn();
    const checkAnyPermission = vi.fn();
    const checkAllPermissions = vi.fn();
    const checkIsAdmin = vi.fn();
    const checkIsInRole = vi.fn();

    vi.mocked(checkerFactories.checkPermissionFactory).mockReturnValue(
      checkPermission,
    );
    vi.mocked(checkerFactories.checkAnyPermissionFactory).mockReturnValue(
      checkAnyPermission,
    );
    vi.mocked(checkerFactories.checkAllPermissionsFactory).mockReturnValue(
      checkAllPermissions,
    );
    vi.mocked(checkerFactories.checkIsAdminFactory).mockReturnValue(
      checkIsAdmin,
    );
    vi.mocked(checkerFactories.checkIsInRoleFactory).mockReturnValue(
      checkIsInRole,
    );

    const requirePermission = vi.fn();
    const requireAnyPermission = vi.fn();
    const requireAllPermissions = vi.fn();
    const requireHubAccess = vi.fn();
    const requireAdmin = vi.fn();
    const requireRole = vi.fn();
    const requirePlatformAdmin = vi.fn();

    vi.mocked(guardFactories.requirePermissionFactory).mockReturnValue(
      requirePermission,
    );
    vi.mocked(guardFactories.requireAnyPermissionFactory).mockReturnValue(
      requireAnyPermission,
    );
    vi.mocked(guardFactories.requireAllPermissionsFactory).mockReturnValue(
      requireAllPermissions,
    );
    vi.mocked(guardFactories.requireHubAccessFactory).mockReturnValue(
      requireHubAccess,
    );
    vi.mocked(guardFactories.requireAdminAccessFactory).mockReturnValue(
      requireAdmin,
    );
    vi.mocked(guardFactories.requireRoleFactory).mockReturnValue(requireRole);
    vi.mocked(guardFactories.requirePlatformAdminFactory).mockReturnValue(
      requirePlatformAdmin,
    );

    return {
      getAuthData,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      checkIsAdmin,
      checkIsInRole,
      requirePermission,
      requireAnyPermission,
      requireAllPermissions,
      requireHubAccess,
      requireAdmin,
      requireRole,
      requirePlatformAdmin,
    };
  }

  it("uses provided session without calling auth()", async () => {
    const factories = setupAuthorizationServiceFns();

    const service = await createAuthorizationService(mockSession);

    expect(auth).not.toHaveBeenCalled();
    expect(getAuthDataForCurrentUser).toHaveBeenCalledWith(mockSession);
    expect(service.getAuthorizationData).toBe(factories.getAuthData);
  });

  it("fetches session via auth() when not provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as unknown as NextMiddleware);
    setupAuthorizationServiceFns();

    await createAuthorizationService();

    expect(auth).toHaveBeenCalledTimes(1);
    expect(getAuthDataForCurrentUser).toHaveBeenCalledWith(mockSession);
  });

  it("returns service methods wired to factories", async () => {
    const factories = setupAuthorizationServiceFns();

    const service = await createAuthorizationService(mockSession);

    expect(service.checkPermission).toBe(factories.checkPermission);
    expect(service.checkAnyPermission).toBe(factories.checkAnyPermission);
    expect(service.checkAllPermissions).toBe(factories.checkAllPermissions);
    expect(service.requirePermission).toBe(factories.requirePermission);
    expect(service.requireAnyPermission).toBe(factories.requireAnyPermission);
    expect(service.requireAllPermissions).toBe(factories.requireAllPermissions);
    expect(service.requireHubAccess).toBe(factories.requireHubAccess);
    expect(service.requireAdmin).toBe(factories.requireAdmin);
    expect(service.requireRole).toBe(factories.requireRole);
    expect(service.requirePlatformAdmin).toBe(factories.requirePlatformAdmin);
  });
});
