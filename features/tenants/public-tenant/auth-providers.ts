import { ENDATIX_AUTH_PROVIDER_ID } from "@/features/auth/infrastructure/auth-constants";

/**
 * Endatix credentials are always offered; everything else must be on the
 * tenant's allow list.
 */
export function filterTenantAuthProviders<T extends { id: string }>(
  providers: readonly T[],
  allowedAuthProviders: readonly string[],
): T[] {
  const allowed = new Set(allowedAuthProviders.map((key) => key.toLowerCase()));

  return providers.filter(
    (provider) =>
      provider.id === ENDATIX_AUTH_PROVIDER_ID ||
      allowed.has(provider.id.toLowerCase()),
  );
}
