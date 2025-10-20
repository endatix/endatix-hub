import { PermissionResult } from "../result/permission-result";

/**
 * Expanded user information with roles and permissions
 * This matches the backend response structure
 */
interface UserRbacInfo {
  userId: string;
  roles: string[];
  permissions: string[]; // Will be typed as Permission[] when imported
  permissionsVersion: number;
  tenantId?: string;
  lastUpdated: string; // ISO timestamp
}

interface PermissionService {
  /**
   * Returns current user's RBAC permissions result.
   */
  getUserPermissions(): Promise<PermissionResult<UserRbacInfo>>;

  /**
   * Checks if user has given permission.
   * @param permission - e.g. "org:read"
   */
  checkPermission(permission: string): Promise<PermissionResult>;

  /**
   * Returns success if user has at least one of the permissions.
   * @param permissions - permission names
   */
  checkAnyPermission(permissions: string[]): Promise<PermissionResult>;

  /**
   * Returns success only if user has all listed permissions.
   * @param permissions - permission names
   */
  checkAllPermissions(permissions: string[]): Promise<PermissionResult>;

  /**
   * Throws if user lacks a specific permission.
   * @param permission - single permission
   */
  requirePermission(permission: string): Promise<void>;

  /**
   * Throws unless user has any one of the provided permissions.
   * @param permissions - permission names
   */
  requireAnyPermission(permissions: string[]): Promise<void>;

  /**
   * Throws unless user has all provided permissions.
   * @param permissions - permission names
   */
  requireAllPermissions(permissions: string[]): Promise<void>;

  /**
   * Throws if user cannot access hub.
   */
  requireHubAccess(): Promise<void>;

  /**
   * Throws if user is not an admin.
   */
  requireAdminAccess(): Promise<void>;

  /**
   * Returns in-memory permission cache stats.
   * @param format - "json" for object, "text" for string output
   */
  getCacheStats(format?: "json" | "text"): string | object;
}

// Re-export PermissionService types and utilities
export type { UserRbacInfo, PermissionService };
