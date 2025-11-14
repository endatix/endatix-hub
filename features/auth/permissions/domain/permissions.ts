/**
 * Permission constants matching the backend Actions.cs structure
 */

export const Permissions = {
  Apps: {
    HubAccess: "apps.hub.access",
    SaaSAdminAccess: "apps.saas.access",
  },
} as const;

/**
 * Type for all permission values
 */
export type Permission = string;

/**
 * Helper to get all permissions as an array
 */
export function getAllPermissions(): Permission[] {
  const permissions: Permission[] = [];

  for (const category of Object.values(Permissions)) {
    for (const permission of Object.values(category)) {
      permissions.push(permission);
    }
  }

  return permissions;
}

/**
 * Helper to check if a string is a valid permission
 */
export function isValidPermission(value: string): value is Permission {
  return getAllPermissions().includes(value as Permission);
}
