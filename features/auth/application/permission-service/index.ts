import { Session } from "next-auth";
import { PermissionService } from "./types";
import {
  getUserPermissionsFactory,
  getCacheStatsFactory,
} from "./user-permissions";
import {
  checkPermissionFactory,
  checkAnyPermissionFactory,
  checkAllPermissionsFactory,
} from "./permission-checker";
import {
  requirePermissionFactory,
  requireAnyPermissionFactory,
  requireAllPermissionsFactory,
  requireHubAccessFactory,
  requireAdminAccessFactory,
} from "./permission-requirer";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Factory function to create the Permission Service
 * Note that it is not Edge Runtime compatible due to unstable_cache usage, so don't use with Middleware
 * @param session The session return from `await auth()`
 * @returns 
 */
export function createPermissionService(
  session: Session | null,
): PermissionService {
  // Create the core user permissions function
  const getUserPermissions = getUserPermissionsFactory(session);

  // Create permission checking functions
  const checkPermission = checkPermissionFactory(getUserPermissions);
  const checkAnyPermission = checkAnyPermissionFactory(getUserPermissions);
  const checkAllPermissions = checkAllPermissionsFactory(getUserPermissions);

  // Create permission requiring functions
  const requirePermission = requirePermissionFactory(checkPermission);
  const requireAnyPermission = requireAnyPermissionFactory(checkAnyPermission);
  const requireAllPermissions =
    requireAllPermissionsFactory(checkAllPermissions);
  const requireHubAccess = requireHubAccessFactory(checkPermission);
  const requireAdminAccess = requireAdminAccessFactory(checkPermission);

  // Create cache stats function
  const getCacheStats = getCacheStatsFactory();

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
    requireAdminAccess,

    // Direct access to user data
    getUserPermissions,

    // Cache statistics
    getCacheStats,
  };
}

// Re-export types for convenience
export type { PermissionService } from "./types";
