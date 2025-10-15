// Permission type is defined in permissions.ts to avoid circular dependency

/**
 * Expanded user information with roles and permissions
 * This matches the backend response structure
 */
export interface RbacUserInfo {
  userId: string;
  roles: string[];
  permissions: string[]; // Will be typed as Permission[] when imported
  permissionsVersion: number;
  tenantId?: string;
  lastUpdated: string; // ISO timestamp
}

/**
 * Role information
 */
export interface RoleInfo {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // Will be typed as Permission[] when imported
  isSystemRole: boolean;
}

/**
 * User permissions context for authorization
 */
export interface UserPermissions {
  userId: string;
  permissions: string[]; // Will be typed as Permission[] when imported
  roles: string[];
  permissionsVersion: number;
  tenantId?: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  missingPermissions: string[]; // Will be typed as Permission[] when imported
  userPermissions: string[]; // Will be typed as Permission[] when imported
}

/**
 * Cache metadata for permission data
 */
export interface PermissionCacheMetadata {
  userId: string;
  cachedAt: string;
  permissionsVersion: number;
  ttl: number; // Time to live in seconds
}

/**
 * Error types for permission operations
 */
export type PermissionError = 
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'CACHE_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_PERMISSION'
  | 'SERVICE_UNAVAILABLE';

/**
 * Result type for permission operations
 */
export interface PermissionResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    type: PermissionError;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Permission requirement for authorization
 */
export interface PermissionRequirement {
  permission: string; // Will be typed as Permission when imported
  resourceId?: string; // For ownership-based permissions
  context?: Record<string, unknown>; // Additional context
}
