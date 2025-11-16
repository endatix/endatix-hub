import { Session } from "next-auth";

import { getAuthorizationDataFactory } from "./user-permissions";
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
} from "./permission-guard";
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
  // Create the core user permissions function
  const getAuthorizationData = getAuthorizationDataFactory(session);

  // Create permission checking functions
  const checkPermission = checkPermissionFactory(getAuthorizationData);
  const checkAnyPermission = checkAnyPermissionFactory(getAuthorizationData);
  const checkAllPermissions = checkAllPermissionsFactory(getAuthorizationData);

  // Create permission requiring functions
  const requirePermission = requirePermissionFactory(checkPermission);
  const requireAnyPermission = requireAnyPermissionFactory(checkAnyPermission);
  const requireAllPermissions =
    requireAllPermissionsFactory(checkAllPermissions);
  const requireHubAccess = requireHubAccessFactory(checkPermission);
  const requireAdminAccess = requireAdminAccessFactory(checkPermission);

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
    getAuthorizationData,
  };
}
