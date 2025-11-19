import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  checkPermissionFactory,
  checkAnyPermissionFactory,
  checkAllPermissionsFactory,
  checkIsAdminFactory,
  checkIsInRoleFactory,
} from "../authorization-checkers";
import {
  AuthorizationErrorType,
  AuthorizationResult,
} from "../../domain/authorization-result";
import { createTestAuthorizationData } from "./helpers";

const unauthenticatedResult = AuthorizationResult.unauthenticated();
const serverErrorResult = AuthorizationResult.error();

describe("authorization-checkers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseAuthData = createTestAuthorizationData();

  describe("checkPermissionFactory", () => {
    it("returns success when user has permission", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          permissions: ["forms.read"],
        }),
      );

      const checkPermission = checkPermissionFactory(getAuthData);
      const result = await checkPermission("forms.read");

      expect(result.success).toBe(true);
      expect(getAuthData).toHaveBeenCalledTimes(1);
    });

    it("returns forbidden when user lacks permission", async () => {
      const getAuthData = vi
        .fn()
        .mockResolvedValue(AuthorizationResult.success(baseAuthData));

      const checkPermission = checkPermissionFactory(getAuthData);
      const result = await checkPermission("forms.read");

      expect(result.success).toBe(false);
      expect(AuthorizationResult.getErrorType(result)).toBe(
        AuthorizationErrorType.AccessDenied,
      );
    });

    it("allows admin to bypass permission checks", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          isAdmin: true,
        }),
      );

      const checkPermission = checkPermissionFactory(getAuthData);
      const result = await checkPermission("any.permission");

      expect(result.success).toBe(true);
    });

    it("returns upstream error when getAuthData fails", async () => {
      const getAuthData = vi.fn().mockResolvedValue(unauthenticatedResult);

      const checkPermission = checkPermissionFactory(getAuthData);
      const result = await checkPermission("forms.read");

      expect(result).toBe(unauthenticatedResult);
    });

    it("returns server error when getAuthData throws", async () => {
      const getAuthData = vi.fn().mockRejectedValue(new Error("network"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const checkPermission = checkPermissionFactory(getAuthData);
      const result = await checkPermission("forms.read");

      expect(result.success).toBe(false);
      expect(AuthorizationResult.getErrorType(result)).toBe(
        AuthorizationErrorType.ServerError,
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("checkAnyPermissionFactory", () => {
    it("returns success when any permission matches", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          permissions: ["forms.read"],
        }),
      );

      const checkAnyPermission = checkAnyPermissionFactory(getAuthData);
      const result = await checkAnyPermission(["forms.create", "forms.read"]);

      expect(result.success).toBe(true);
    });

    it("returns forbidden when no permissions match", async () => {
      const getAuthData = vi
        .fn()
        .mockResolvedValue(AuthorizationResult.success(baseAuthData));

      const checkAnyPermission = checkAnyPermissionFactory(getAuthData);
      const result = await checkAnyPermission(["forms.create"]);

      expect(result.success).toBe(false);
    });

    it("returns upstream error when auth data fails", async () => {
      const getAuthData = vi.fn().mockResolvedValue(serverErrorResult);

      const checkAnyPermission = checkAnyPermissionFactory(getAuthData);
      const result = await checkAnyPermission(["forms.create"]);

      expect(result).toBe(serverErrorResult);
    });
  });

  describe("checkAllPermissionsFactory", () => {
    it("returns success when all permissions match", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          permissions: ["forms.read", "forms.create"],
        }),
      );

      const checkAllPermissions = checkAllPermissionsFactory(getAuthData);
      const result = await checkAllPermissions(["forms.read", "forms.create"]);

      expect(result.success).toBe(true);
    });

    it("returns forbidden when one permission is missing", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          permissions: ["forms.read"],
        }),
      );

      const checkAllPermissions = checkAllPermissionsFactory(getAuthData);
      const result = await checkAllPermissions(["forms.read", "forms.create"]);

      expect(result.success).toBe(false);
      expect(AuthorizationResult.getErrorType(result)).toBe(
        AuthorizationErrorType.AccessDenied,
      );
    });

    it("returns server error when getAuthData throws", async () => {
      const getAuthData = vi.fn().mockRejectedValue(new Error("network"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const checkAllPermissions = checkAllPermissionsFactory(getAuthData);
      const result = await checkAllPermissions(["forms.read"]);

      expect(result.success).toBe(false);
      expect(AuthorizationResult.getErrorType(result)).toBe(
        AuthorizationErrorType.ServerError,
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("checkIsAdminFactory", () => {
    it("returns success when user is admin", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          isAdmin: true,
        }),
      );

      const checkIsAdmin = checkIsAdminFactory(getAuthData);
      const result = await checkIsAdmin();

      expect(result.success).toBe(true);
    });

    it("returns forbidden when user is not admin", async () => {
      const getAuthData = vi
        .fn()
        .mockResolvedValue(AuthorizationResult.success(baseAuthData));

      const checkIsAdmin = checkIsAdminFactory(getAuthData);
      const result = await checkIsAdmin();

      expect(result.success).toBe(false);
    });

    it("returns upstream error when auth data fails", async () => {
      const getAuthData = vi.fn().mockResolvedValue(unauthenticatedResult);

      const checkIsAdmin = checkIsAdminFactory(getAuthData);
      const result = await checkIsAdmin();

      expect(result).toBe(unauthenticatedResult);
    });
  });

  describe("checkIsInRoleFactory", () => {
    it("returns success when user has role", async () => {
      const getAuthData = vi.fn().mockResolvedValue(
        AuthorizationResult.success({
          ...baseAuthData,
          roles: ["Admin"],
        }),
      );

      const checkIsInRole = checkIsInRoleFactory(getAuthData);
      const result = await checkIsInRole("Admin");

      expect(result.success).toBe(true);
    });

    it("returns forbidden when user lacks role", async () => {
      const getAuthData = vi
        .fn()
        .mockResolvedValue(AuthorizationResult.success(baseAuthData));

      const checkIsInRole = checkIsInRoleFactory(getAuthData);
      const result = await checkIsInRole("Admin");

      expect(result.success).toBe(false);
    });

    it("returns upstream error when auth data fails", async () => {
      const getAuthData = vi.fn().mockResolvedValue(serverErrorResult);

      const checkIsInRole = checkIsInRoleFactory(getAuthData);
      const result = await checkIsInRole("Admin");

      expect(result).toBe(serverErrorResult);
    });
  });
});
