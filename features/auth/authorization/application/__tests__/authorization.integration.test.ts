import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { createMockSession, createAuthSuccess, mockRedirect } from "./helpers";

vi.mock("next-auth", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../authorization-data.provider", () => ({
  getAuthDataForCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => {
  const redirect = mockRedirect();
  return { redirect };
});

vi.mock("../../infrastructure", () => ({
  SIGNIN_PATH: "/signin",
  UNAUTHORIZED_PATH: "/unauthorized",
}));

import { createAuthorizationService } from "../authorization-service.factory";
import { Permissions } from "../../domain/permissions";
import { SystemRoles } from "../../domain/system-roles";
import { getAuthDataForCurrentUser } from "../authorization-data.provider";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationResult } from "../../domain/authorization-result";
import { NextMiddleware } from "next/server";

describe("authorization integration", () => {
  const mockSession: Session = createMockSession();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin user to access hub and admin features", async () => {
    const mockAuthData = createAuthSuccess({
      roles: [SystemRoles.PlatformAdmin],
      permissions: [Permissions.Access.Hub],
      isAdmin: true,
    });

    const getAuthData = vi.fn().mockResolvedValue(mockAuthData);
    vi.mocked(getAuthDataForCurrentUser).mockReturnValue(getAuthData);

    const service = await createAuthorizationService(mockSession);

    await expect(service.requireHubAccess()).resolves.not.toThrow();
    await expect(service.requireAdmin()).resolves.not.toThrow();
    await expect(
      service.requireRole(SystemRoles.PlatformAdmin),
    ).resolves.not.toThrow();

    expect(getAuthData).toHaveBeenCalledTimes(3);
  });

  it("redirects to unauthorized when user lacks hub access", async () => {
    const mockAuthData = createAuthSuccess();

    const getAuthData = vi.fn().mockResolvedValue(mockAuthData);
    vi.mocked(getAuthDataForCurrentUser).mockReturnValue(getAuthData);

    const service = await createAuthorizationService(mockSession);

    await expect(service.requireHubAccess()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects to signin when user is unauthenticated", async () => {
    const unauthenticated = AuthorizationResult.unauthenticated();
    const getAuthData = vi.fn().mockResolvedValue(unauthenticated);
    vi.mocked(getAuthDataForCurrentUser).mockReturnValue(getAuthData);

    const service = await createAuthorizationService(mockSession);

    await expect(service.requireAdmin()).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/signin");
  });

  it("fetches session via auth() when session is not provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as unknown as NextMiddleware);
    const mockAuthData = createAuthSuccess({
      permissions: [Permissions.Access.Hub],
    });

    const getAuthData = vi.fn().mockResolvedValue(mockAuthData);
    vi.mocked(getAuthDataForCurrentUser).mockReturnValue(getAuthData);

    const service = await createAuthorizationService();

    expect(auth).toHaveBeenCalledTimes(1);
    await expect(service.requireHubAccess()).resolves.not.toThrow();
  });
});
