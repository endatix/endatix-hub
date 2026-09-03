import type { AuthProviderOption } from "../tenant-registration";
import type { AuthAdminSummary } from "./view-auth-settings.server";

/**
 * Active sign-in providers offered when configuring tenant self-registration.
 * Hub-registered providers win over the API catalog on id collisions.
 */
export function toAuthProviderOptions(
  summary: AuthAdminSummary,
): AuthProviderOption[] {
  const options = new Map<string, AuthProviderOption>();

  for (const provider of summary.hub.providers) {
    if (provider.isActive) {
      options.set(provider.id, { id: provider.id, name: provider.name });
    }
  }

  for (const provider of summary.api?.providers ?? []) {
    if (provider.isActive && !options.has(provider.providerId)) {
      options.set(provider.providerId, {
        id: provider.providerId,
        name: provider.displayName,
      });
    }
  }

  return [...options.values()];
}
