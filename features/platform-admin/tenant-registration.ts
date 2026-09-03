import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import type { Route } from "next";

export type AuthProviderOption = {
  id: string;
  name: string;
};

export type TenantRegistrationRoleOption = {
  name: string;
  hasHubAccess: boolean;
};

/**
 * Roles the API accepts as a tenant self-registration default. Mirrors
 * `TenantSettings.ValidateDefaultRegistrationRole` in Endatix Core: platform-scoped,
 * anonymous, and non-persisted roles are rejected there.
 */
export const TENANT_REGISTRATION_ROLES: readonly TenantRegistrationRoleOption[] =
  [
    { name: SystemRoles.Respondent, hasHubAccess: false },
    { name: SystemRoles.Creator, hasHubAccess: true },
    { name: SystemRoles.Admin, hasHubAccess: true },
  ];

export function tenantNameError(
  name: string | null | undefined,
): string | null {
  return name?.trim() ? null : "Name is required.";
}

export function tenantPublicSignInPath(shortUrl: string): Route {
  return `/t/${shortUrl}/signin` as Route;
}

/** Unknown roles do not imply Hub access. */
export function roleHasHubAccess(roleName: string): boolean {
  return TENANT_REGISTRATION_ROLES.some(
    (role) => role.name === roleName && role.hasHubAccess,
  );
}
