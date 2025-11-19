/**
 * Permission constants matching the backend Actions.cs structure
 */

export const Permissions = {
  Access: {
    Hub: "access.apps.hub",
    Authenticated: "access.authenticated",
  },
  Platform: {
    ManageTenants: "platform.tenants.manage",
    ManageSettings: "platform.settings.manage",
    ManageIntegrations: "platform.integrations.manage",
    ImpersonateUsers: "platform.users.impersonate",
    ViewMetrics: "platform.metrics.view",
    ViewLogs: "platform.logs.views",
    ViewUsage: "platform.usage.view",
  },
  Tenant: {
    InviteUsers: "tenant.users.invite",
    ViewUsers: "tenant.users.view",
    ManageUsers: "tenant.users.manage",
    ViewRoles: "tenant.roles.view",
    ManageRoles: "tenant.roles.manage",
    ViewSettings: "tenant.settings.view",
    ManageSettings: "tenant.settings.manage",
    ViewUsage: "tenant.usage.view",
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
