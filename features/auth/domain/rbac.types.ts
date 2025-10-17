// Permission type is defined in permissions.ts to avoid circular dependency

/**
 * Expanded user information with roles and permissions
 * This matches the backend response structure
 */
interface RbacUserInfo {
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
interface _RoleInfo {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // Will be typed as Permission[] when imported
  isSystemRole: boolean;
}

/**
 * User permissions context for authorization
 */
interface _UserPermissions {
  userId: string;
  permissions: string[]; // Will be typed as Permission[] when imported
  roles: string[];
  permissionsVersion: number;
  tenantId?: string;
}

// Re-export PermissionResult types and utilities
export type { RbacUserInfo, _RoleInfo, _UserPermissions };
