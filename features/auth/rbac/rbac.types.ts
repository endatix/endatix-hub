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

// Re-export PermissionResult types and utilities
export type { UserRbacInfo };
