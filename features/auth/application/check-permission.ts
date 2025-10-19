import { PermissionResult } from "../rbac/permission-result";
import { getUserPermissions } from "./get-user-permissions";

/**
 * Check if the current user has a specific permission
 * @param permission - The permission to check
 * @returns Promise<PermissionResult<boolean>> - Result containing boolean or error
 */
export async function checkPermission(
  permission: string,
): Promise<PermissionResult> {
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
}

/**
 * Check if the current user has any or all of the specified permissions
 * @param permissions - Array of permissions to check
 * @param mode - "any" to check if user has any of the permissions, "all" to check if user has all of the permissions
 * @returns Promise<PermissionResult> - Success if user has at least one permission, error otherwise
 */
export async function checkForPermissions(
  permissions: string[],
  mode: "any" | "all" = "any",
): Promise<PermissionResult> {
  try {
    const result = await getUserPermissions();

    if (!result.success) {
      return result;
    }

    let hasAccess = false;
    if (mode === "any") {
      hasAccess = permissions.some((permission) =>
        result.data.permissions.includes(permission),
      );
    } else if (mode === "all") {
      hasAccess = permissions.every((permission) =>
        result.data.permissions.includes(permission),
      );
    }

    return hasAccess
      ? PermissionResult.success()
      : PermissionResult.forbidden();
  } catch (error) {
    console.error("Unexpected error during checking permissions:", error);
    return PermissionResult.error();
  }
}
