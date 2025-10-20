import { PermissionResult } from "../../rbac/permission-result";

export function checkPermissionFactory(
  getUserPermissions: () => Promise<PermissionResult<any>>
) {
  return async (permission: string): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();
      
      if (!result.success) {
        return result;
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
  getUserPermissions: () => Promise<PermissionResult<any>>
) {
  return async (permissions: string[]): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();
      
      if (!result.success) {
        return result;
      }

      const hasAny = permissions.some((permission) =>
        result.data.permissions.includes(permission),
      );
      
      return hasAny
        ? PermissionResult.success()
        : PermissionResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return PermissionResult.error();
    }
  };
}

export function checkAllPermissionsFactory(
  getUserPermissions: () => Promise<PermissionResult<any>>
) {
  return async (permissions: string[]): Promise<PermissionResult> => {
    try {
      const result = await getUserPermissions();
      
      if (!result.success) {
        return result;
      }

      const hasAll = permissions.every((permission) =>
        result.data.permissions.includes(permission),
      );
      
      return hasAll
        ? PermissionResult.success()
        : PermissionResult.forbidden();
    } catch (error) {
      console.error("Unexpected error during checking permissions:", error);
      return PermissionResult.error();
    }
  };
}
