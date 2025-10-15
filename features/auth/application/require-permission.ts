import { forbidden } from "next/navigation";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "./check-permission";
import { Permissions as AppPermissions } from "../domain/permissions";

/**
 * Require a specific permission - throws forbidden() if user doesn't have it
 * @param permission - The permission to require
 * @throws Calls forbidden() if permission is missing
 */
export async function requirePermission(permission: string): Promise<void> {
  const hasAccess = await hasPermission(permission);

  if (!hasAccess) {
    console.warn(
      `Access denied: User missing required permission: ${permission}`,
    );
    forbidden();
  }
}

/**
 * Require any of the specified permissions - throws forbidden() if user has none
 * @param permissions - Array of permissions to check
 * @throws Calls forbidden() if user has none of the permissions
 */
export async function requireAnyPermission(
  permissions: string[],
): Promise<void> {
  const hasAccess = await hasAnyPermission(permissions);

  if (!hasAccess) {
    console.warn(
      `Access denied: User missing any of required permissions: ${permissions.join(
        ", ",
      )}`,
    );
    forbidden();
  }
}

/**
 * Require all of the specified permissions - throws forbidden() if user is missing any
 * @param permissions - Array of permissions to check
 * @throws Calls forbidden() if user is missing any of the permissions
 */
export async function requireAllPermissions(
  permissions: string[],
): Promise<void> {
  const hasAccess = await hasAllPermissions(permissions);

  if (!hasAccess) {
    console.warn(
      `Access denied: User missing required permissions: ${permissions.join(
        ", ",
      )}`,
    );
    forbidden();
  }
}

export async function requireHubAccess() {
  await requirePermission(AppPermissions.Apps.HubAccess);
}

export async function requireAdminAccess() {
  await requirePermission(AppPermissions.Admin.All);
}
