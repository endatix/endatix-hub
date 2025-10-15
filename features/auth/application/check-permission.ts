import { getUserPermissions } from "./get-user-permissions";
import type { PermissionCheckResult } from "../domain/rbac.types";

/**
 * Check if the current user has a specific permission
 * @param permission - The permission to check
 * @returns Promise<boolean> - true if user has permission, false otherwise
 */
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const result = await getUserPermissions();
    
    if (!result.success || !result.data) {
      return false;
    }

    return result.data.permissions.includes(permission);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if the current user has any of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Promise<boolean> - true if user has at least one permission, false otherwise
 */
export async function hasAnyPermission(
  permissions: string[],
): Promise<boolean> {
  try {
    const result = await getUserPermissions();

    if (!result.success || !result.data) {
      return false;
    }

    return permissions.some((permission) =>
      result.data!.permissions.includes(permission),
    );
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Check if the current user has all of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Promise<boolean> - true if user has all permissions, false otherwise
 */
export async function hasAllPermissions(
  permissions: string[],
): Promise<boolean> {
  try {
    const result = await getUserPermissions();

    if (!result.success || !result.data) {
      return false;
    }

    return permissions.every((permission) =>
      result.data!.permissions.includes(permission),
    );
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}
