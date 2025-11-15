import { AuthorizationData } from "@/lib/endatix-api/auth/types";
import { AuthorizationResult } from "./authorization-result";

interface PermissionService {
  /**
   * Returns current user's RBAC permissions result.
   */
  getUserPermissions(): Promise<AuthorizationResult<AuthorizationData>>;

  /**
   * Checks if user has given permission.
   * @param permission - e.g. "org:read"
   */
  checkPermission(permission: string): Promise<AuthorizationResult>;

  /**
   * Returns success if user has at least one of the permissions.
   * @param permissions - permission names
   */
  checkAnyPermission(permissions: string[]): Promise<AuthorizationResult>;

  /**
   * Returns success only if user has all listed permissions.
   * @param permissions - permission names
   */
  checkAllPermissions(permissions: string[]): Promise<AuthorizationResult>;

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
}

// Re-export PermissionService types and utilities
export type { AuthorizationData, PermissionService };
