import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import {
  isReservedUrlSlug,
  isValidUrlSlugFormat,
  normalizeUrlSlug,
  urlSlugFromDisplayName,
} from "@/lib/url/url-slug";

export type AuthProviderOption = {
  id: string;
  name: string;
};

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

export function suggestedTenantSlug(
  name: string,
  currentSlug: string,
  slugTouched: boolean,
): string {
  if (slugTouched) {
    return currentSlug;
  }

  return urlSlugFromDisplayName(name);
}

export function identityStepError(name: string, slug: string): string | null {
  if (!name.trim()) {
    return "Name is required.";
  }

  const normalized = normalizeUrlSlug(slug);
  if (!normalized) {
    return "Slug is required.";
  }

  if (!isValidUrlSlugFormat(normalized)) {
    return "Slug format is invalid. Use lowercase letters, numbers, and hyphens.";
  }

  if (isReservedUrlSlug(normalized)) {
    return "This slug is reserved.";
  }

  return null;
}

export function roleHasHubAccess(roleName: string): boolean {
  return (
    TENANT_DEFAULT_REGISTRATION_ROLES.find((role) => role.name === roleName)
      ?.hasHubAccess ?? true
  );
}
