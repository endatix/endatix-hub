import { AuthorizationData } from "@/lib/endatix-api/types";
import { AuthorizationResult } from "../domain/authorization-result";

export function checkPermissionFactory(
  getUserPermissions: () => Promise<AuthorizationResult<AuthorizationData>>,
) {
  return async (permission: string): Promise<AuthorizationResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasPermission = result.data.permissions.includes(permission);
      return hasPermission
        ? AuthorizationResult.success()
        : AuthorizationResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permission:", error);
      return AuthorizationResult.error();
    }
  };
}

export function checkAnyPermissionFactory(
  getUserPermissions: () => Promise<AuthorizationResult<AuthorizationData>>,
) {
  return async (permissions: string[]): Promise<AuthorizationResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasAny = permissions.some((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAny ? AuthorizationResult.success() : AuthorizationResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return AuthorizationResult.error();
    }
  };
}

export function checkAllPermissionsFactory(
  getUserPermissions: () => Promise<AuthorizationResult<AuthorizationData>>,
) {
  return async (permissions: string[]): Promise<AuthorizationResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasAll = permissions.every((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAll ? AuthorizationResult.success() : AuthorizationResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return AuthorizationResult.error();
    }
  };
}
