/**
 * Permission constants matching the backend Actions.cs structure
 * Follows the pattern: {category}.{action}[.scope]
 */

export const Permissions = {
  /**
   * Application access permissions
   */
  Apps: {
    HubAccess: "apps.hub.access",
    AdminAccess: "apps.saas.access",
    AnalyticsAccess: "apps.analytics.access",
  },

  /**
   * Administrative permissions - bypass all other checks (system-wide)
   */
  Admin: {
    All: "admin.all",
    ManageUsers: "admin.users.manage",
    ManageRoles: "admin.roles.manage",
    ViewSystemLogs: "admin.logs.view",
    ManageSystemSettings: "admin.settings.manage",
  },

  /**
   * Form management permissions
   */
  Forms: {
    View: "forms.view",
    Create: "forms.create",
    Edit: "forms.edit",
    Delete: "forms.delete",
    Publish: "forms.publish",

    // Ownership-based permissions
    ViewOwned: "forms.view.owned",
    EditOwned: "forms.edit.owned",
    DeleteOwned: "forms.delete.owned",
    PublishOwned: "forms.publish.owned",
  },

  /**
   * Submission management permissions
   */
  Submissions: {
    View: "submissions.view",
    Create: "submissions.create",
    Edit: "submissions.edit",
    Delete: "submissions.delete",
    Export: "submissions.export",

    // Public submission permissions
    Submit: "submissions.submit",
    UpdatePartial: "submissions.update.partial",
    ViewPublicForm: "submissions.view.public.form",

    // Ownership-based permissions
    ViewOwned: "submissions.view.owned",
    EditOwned: "submissions.edit.owned",
    DeleteOwned: "submissions.delete.owned",
    ExportOwned: "submissions.export.owned",
  },

  /**
   * Template management permissions
   */
  Templates: {
    View: "templates.view",
    Create: "templates.create",
    Edit: "templates.edit",
    Delete: "templates.delete",

    // Ownership-based permissions
    ViewOwned: "templates.view.owned",
    EditOwned: "templates.edit.owned",
    DeleteOwned: "templates.delete.owned",
  },

  /**
   * Analytics and reporting permissions
   */
  Analytics: {
    View: "analytics.view",
    ViewAdvanced: "analytics.view.advanced",
    Export: "analytics.export",
    ViewRealtime: "analytics.realtime.view",

    // Ownership-based permissions
    ViewOwned: "analytics.view.owned",
    ExportOwned: "analytics.export.owned",
  },

  /**
   * Tenant management permissions (SaaS management)
   */
  Tenant: {
    View: "tenant.view",
    Manage: "tenant.manage",
    InviteUsers: "tenant.users.invite",
    ManageUsers: "tenant.users.manage",
    ViewBilling: "tenant.billing.view",
    ManageBilling: "tenant.billing.manage",
    ViewSettings: "tenant.settings.view",
    ManageSettings: "tenant.settings.manage",
    ViewUsage: "tenant.usage.view",
    ManageIntegrations: "tenant.integrations.manage",
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
