import { describe, expect, it } from "vitest";
import type { AuthProviderSettings } from "@/lib/endatix-api/auth-admin/types";
import type { HubAuthProviderSummary } from "@/features/auth/use-cases/view-settings-summary/hub-auth-admin-summary";
import { toAuthProviderOptions } from "../auth-provider-options";
import type { AuthAdminSummary } from "../view-auth-settings.server";

function hubProvider(
  overrides: Partial<HubAuthProviderSummary> & { id: string },
): HubAuthProviderSummary {
  return {
    name: overrides.id,
    type: "oidc",
    isActive: true,
    issuer: null,
    clientId: null,
    clientSecretConfigured: false,
    ...overrides,
  };
}

function apiProvider(
  overrides: Partial<AuthProviderSettings> & { providerId: string },
): AuthProviderSettings {
  return {
    displayName: overrides.providerId,
    isRegistered: true,
    isEnabled: true,
    isActive: true,
    issuer: null,
    audiences: [],
    accessExpiryMinutes: null,
    refreshExpiryDays: null,
    requireHttpsMetadata: null,
    endatixJwt: null,
    keycloak: null,
    ...overrides,
  };
}

function summary(
  hub: HubAuthProviderSummary[],
  api: AuthProviderSettings[] | null,
): AuthAdminSummary {
  return {
    hub: {
      sessionSecretConfigured: true,
      sessionMaxAgeMinutes: null,
      providers: hub,
      configurationErrors: [],
    },
    api: api && {
      platformAdminRequiresLocalApproval: false,
      configurationErrors: [],
      providers: api,
    },
    driftHints: [],
  };
}

describe("toAuthProviderOptions", () => {
  it("keeps only active providers", () => {
    const options = toAuthProviderOptions(
      summary(
        [
          hubProvider({ id: "keycloak" }),
          hubProvider({ id: "off", isActive: false }),
        ],
        [apiProvider({ providerId: "azure", isActive: false })],
      ),
    );

    expect(options).toEqual([{ id: "keycloak", name: "keycloak" }]);
  });

  it("merges the API catalog and lets Hub win on id collisions", () => {
    const options = toAuthProviderOptions(
      summary(
        [hubProvider({ id: "keycloak", name: "Keycloak" })],
        [
          apiProvider({ providerId: "keycloak", displayName: "API Keycloak" }),
          apiProvider({ providerId: "azure", displayName: "Azure AD" }),
        ],
      ),
    );

    expect(options).toEqual([
      { id: "keycloak", name: "Keycloak" },
      { id: "azure", name: "Azure AD" },
    ]);
  });

  it("tolerates a missing API catalog", () => {
    expect(
      toAuthProviderOptions(summary([hubProvider({ id: "keycloak" })], null)),
    ).toEqual([{ id: "keycloak", name: "keycloak" }]);
  });
});
