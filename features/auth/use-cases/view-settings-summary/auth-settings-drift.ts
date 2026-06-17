export type AuthSettingsDriftHint = {
  readonly message: string;
};

export function getAuthSettingsDriftHints(
  apiIssuer: string | null | undefined,
  hubIssuer: string | null | undefined,
  apiKeycloakEnabled: boolean,
  hubKeycloakActive: boolean,
): AuthSettingsDriftHint[] {
  const hints: AuthSettingsDriftHint[] = [];

  if (apiKeycloakEnabled && !hubKeycloakActive) {
    hints.push({
      message:
        "Keycloak is enabled in the API but not active in the Hub sign-in configuration.",
    });
  }

  if (!apiKeycloakEnabled && hubKeycloakActive) {
    hints.push({
      message:
        "Keycloak is active in the Hub but disabled in the API authentication configuration.",
    });
  }

  if (
    apiKeycloakEnabled &&
    hubKeycloakActive &&
    apiIssuer &&
    hubIssuer &&
    apiIssuer.replace(/\/$/, "") !== hubIssuer.replace(/\/$/, "")
  ) {
    hints.push({
      message:
        "Keycloak issuer differs between API and Hub configuration. Align Endatix:Auth:Providers:Keycloak:Issuer with AUTH_KEYCLOAK_ISSUER.",
    });
  }

  return hints;
}
