import type { Session } from "next-auth";
import { getAuthDataForCurrentUser } from "./authorization-data.provider";
import {
  checkPermissionFactory,
  checkAnyPermissionFactory,
  checkAllPermissionsFactory,
  checkIsAdminFactory,
  checkIsInRoleFactory,
} from "./authorization-checkers";
import {
  requirePermissionFactory,
  requireAnyPermissionFactory,
  requireAllPermissionsFactory,
  requireHubAccessFactory,
  requireAdminAccessFactory,
  requireRoleFactory,
  requirePlatformAdminFactory,
} from "./authorization-guards";
import { auth } from "@/auth";
import { IAuthorizationService } from "../domain/authorization-service";

/**
 * Factory function to create the Permission Service
 * Note that it is not Edge Runtime compatible due to unstable_cache usage, so don't use with Middleware
 * @param session The session return from `await auth()`
 * @returns
 */
export async function createAuthorizationService(
  session: Session | null = null,
): Promise<IAuthorizationService> {
  session = session ?? (await auth());
  // Create the core data fetching function for the current user's authorization data
  const getAuthorizationData = getAuthDataForCurrentUser(session);

  // Create permission checking functions
  const checkPermission = checkPermissionFactory(getAuthorizationData);
  const checkAnyPermission = checkAnyPermissionFactory(getAuthorizationData);
  const checkAllPermissions = checkAllPermissionsFactory(getAuthorizationData);
  const checkIsAdmin = checkIsAdminFactory(getAuthorizationData);
  const checkIsInRole = checkIsInRoleFactory(getAuthorizationData);

  // Create permission requiring functions
  const requirePermission = requirePermissionFactory(checkPermission);
  const requireAnyPermission = requireAnyPermissionFactory(checkAnyPermission);
  const requireAllPermissions =
    requireAllPermissionsFactory(checkAllPermissions);
  const requireHubAccess = requireHubAccessFactory(checkPermission);
  const requireAdmin = requireAdminAccessFactory(checkIsAdmin);
  const requireRole = requireRoleFactory(checkIsInRole);
  const requirePlatformAdmin = requirePlatformAdminFactory(checkIsInRole);

  return {
    // Permission checking methods
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,

    // Permission requiring methods
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireHubAccess,

    // Role requiring methods
    requireAdmin,
    requireRole,
    requirePlatformAdmin,

    // Direct access to user data
    getAuthorizationData,
  };
}
