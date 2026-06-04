import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";

export const PLATFORM_ADMIN_ROLE_ERROR =
  "Platform administrator roles are managed at the platform level.";

export const TENANT_ADMIN_ROLE_ERROR =
  "Admin access can be assigned after the invited user verifies their account.";

export function getUnassignableRoleError(roleNames: readonly string[]) {
  if (roleNames.some(isPlatformAdminRole)) {
    return PLATFORM_ADMIN_ROLE_ERROR;
  }

  if (roleNames.some(isTenantAdminRole)) {
    return TENANT_ADMIN_ROLE_ERROR;
  }

  return null;
}

function isPlatformAdminRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.PlatformAdmin.toLowerCase();
}

function isTenantAdminRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.Admin.toLowerCase();
}
