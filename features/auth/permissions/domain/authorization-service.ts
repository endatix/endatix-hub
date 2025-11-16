import { AuthCheckResult, GetAuthDataResult } from "./authorization-result";

export interface IAuthorizationService {
  /**
   * Returns current user's Authorization data needed for RBAC.
   */
  getAuthorizationData(): Promise<GetAuthDataResult>;

  /**
   * Checks if user has given permission.
   * @param permission - e.g. "org:read"
   */
  checkPermission(permission: string): Promise<AuthCheckResult>;

  /**
   * Returns success if user has at least one of the permissions.
   * @param permissions - permission names
   */
  checkAnyPermission(permissions: string[]): Promise<AuthCheckResult>;

  /**
   * Returns success only if user has all listed permissions.
   * @param permissions - permission names
   */
  checkAllPermissions(permissions: string[]): Promise<AuthCheckResult>;

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