import { AuthorizationData } from "@/lib/endatix-api/types";
import { PermissionResult } from "../result/permission-result";

export function checkPermissionFactory(
  getUserPermissions: () => Promise<PermissionResult<AuthorizationData>>,
) {
  return async (permission: string): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return PermissionResult.success();
      }

      const hasPermission = result.data.permissions.includes(permission);
      return hasPermission
        ? PermissionResult.success()
        : PermissionResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permission:", error);
      return PermissionResult.error();
    }
  };
}

export function checkAnyPermissionFactory(
  getUserPermissions: () => Promise<PermissionResult<AuthorizationData>>,
) {
  return async (permissions: string[]): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return PermissionResult.success();
      }

      const hasAny = permissions.some((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAny ? PermissionResult.success() : PermissionResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return PermissionResult.error();
    }
  };
}

export function checkAllPermissionsFactory(
  getUserPermissions: () => Promise<PermissionResult<AuthorizationData>>,
) {
  return async (permissions: string[]): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return PermissionResult.success();
      }

      const hasAll = permissions.every((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAll ? PermissionResult.success() : PermissionResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return PermissionResult.error();
    }
  };
}
