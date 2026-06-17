import { authRegistry } from "@/features/auth/infrastructure/auth-provider-registry";
import { KEYCLOAK_ID } from "@/features/auth/infrastructure/providers/keycloak-auth-provider";

export type { AuthSettingsDriftHint } from "./auth-settings-drift";
export { getAuthSettingsDriftHints } from "./auth-settings-drift";

/** Server-safe Hub auth snapshot for admin UI (no secrets). */
export type HubAuthProviderSummary = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly isActive: boolean;
  readonly issuer: string | null;
  readonly clientId: string | null;
  readonly clientSecretConfigured: boolean;
};

export type HubAuthAdminSummary = {
  readonly sessionSecretConfigured: boolean;
  readonly sessionMaxAgeMinutes: number | null;
  readonly providers: readonly HubAuthProviderSummary[];
  readonly configurationErrors: readonly string[];
};

function hasConfiguredValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function mapKeycloakPresence(isActive: boolean): HubAuthProviderSummary {
  return {
    id: KEYCLOAK_ID,
    name: "Keycloak",
    type: "oidc",
    isActive,
    issuer: process.env.AUTH_KEYCLOAK_ISSUER ?? null,
    clientId: process.env.AUTH_KEYCLOAK_CLIENT_ID ?? null,
    clientSecretConfigured: hasConfiguredValue(
      process.env.AUTH_KEYCLOAK_CLIENT_SECRET,
    ),
  };
}

function mapProviderSummary(
  provider: ReturnType<typeof authRegistry.getActiveProviders>[number],
): HubAuthProviderSummary {
  if (provider.id === KEYCLOAK_ID) {
    return mapKeycloakPresence(true);
  }

  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    isActive: true,
    issuer: null,
    clientId: null,
    clientSecretConfigured: false,
  };
}

/**
 * Server-safe snapshot of Hub sign-in and session configuration.
 */
export function getHubAuthAdminSummary(): HubAuthAdminSummary {
  const configurationErrors: string[] = [];
  const sessionMaxAgeRaw = process.env.SESSION_MAX_AGE_IN_MINUTES;
  const sessionMaxAgeMinutes = sessionMaxAgeRaw
    ? Number.parseInt(sessionMaxAgeRaw, 10)
    : null;

  if (!hasConfiguredValue(process.env.AUTH_SECRET)) {
    configurationErrors.push("AUTH_SECRET is not configured.");
  }

  const activeProviders = authRegistry
    .getActiveProviders()
    .map(mapProviderSummary);
  const providers: HubAuthProviderSummary[] = [...activeProviders];

  const keycloakEnabled = process.env.AUTH_KEYCLOAK_ENABLED === "true";
  const keycloakActive = authRegistry.isProviderActive(KEYCLOAK_ID);

  if (keycloakEnabled && !keycloakActive) {
    providers.push(mapKeycloakPresence(false));
    configurationErrors.push(
      "Keycloak is enabled but not active. Check AUTH_KEYCLOAK_CLIENT_ID, AUTH_KEYCLOAK_CLIENT_SECRET, and AUTH_KEYCLOAK_ISSUER.",
    );
  }

  return {
    sessionSecretConfigured: hasConfiguredValue(process.env.AUTH_SECRET),
    sessionMaxAgeMinutes:
      sessionMaxAgeMinutes !== null && Number.isNaN(sessionMaxAgeMinutes)
        ? null
        : sessionMaxAgeMinutes,
    providers,
    configurationErrors,
  };
}
