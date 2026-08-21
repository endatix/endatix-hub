import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";

export type TenantRegistrationRoleOption = {
  name: string;
  hasHubAccess: boolean;
};

export const TENANT_DEFAULT_REGISTRATION_ROLES: readonly TenantRegistrationRoleOption[] =
  [
    { name: SystemRoles.Respondent, hasHubAccess: false },
    { name: SystemRoles.Creator, hasHubAccess: true },
    { name: SystemRoles.Admin, hasHubAccess: true },
  ];

export function identityStepError(name: string): string | null {
  if (!name.trim()) {
    return "Name is required.";
  }

  return null;
}

export function tenantPublicSignInPath(slug: string): string {
  return `/t/${slug}/signin`;
}

export function tenantPublicRegisterPath(slug: string): string {
  return `/t/${slug}/register`;
}

export function filterTenantAuthProviders<T extends { id: string }>(
  providers: readonly T[],
  allowedAuthProviders: readonly string[],
): T[] {
  const allowed = new Set(
    allowedAuthProviders.map((key) => key.toLowerCase()),
  );

  return providers.filter((provider) => {
    if (provider.id === "endatix") {
      return true;
    }

    return allowed.has(provider.id.toLowerCase());
  });
}

export function roleHasHubAccess(roleName: string): boolean {
  return (
    TENANT_DEFAULT_REGISTRATION_ROLES.find((role) => role.name === roleName)
      ?.hasHubAccess ?? true
  );
}
