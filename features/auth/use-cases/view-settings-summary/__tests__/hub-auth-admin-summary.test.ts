import { describe, expect, it } from "vitest";
import { getAuthSettingsDriftHints } from "@/features/auth/use-cases/view-settings-summary/auth-settings-drift";

describe("getAuthSettingsDriftHints", () => {
  it("detects issuer mismatch between API and Hub", () => {
    const hints = getAuthSettingsDriftHints(
      "https://keycloak.example/realms/endatix",
      "https://keycloak.example/realms/endatix/",
      true,
      true,
    );

    expect(hints).toHaveLength(0);
  });

  it("detects when API enables Keycloak but Hub does not activate it", () => {
    const hints = getAuthSettingsDriftHints(
      "https://keycloak.example/realms/endatix",
      null,
      true,
      false,
    );

    expect(hints).toEqual([
      {
        message:
          "Keycloak is enabled in the API but not active in the Hub sign-in configuration.",
      },
    ]);
  });

  it("detects different issuers when both sides are active", () => {
    const hints = getAuthSettingsDriftHints(
      "https://api-keycloak.example/realms/endatix",
      "https://hub-keycloak.example/realms/endatix",
      true,
      true,
    );

    expect(hints).toEqual([
      {
        message:
          "Keycloak issuer differs between API and Hub configuration. Align Endatix:Auth:Providers:Keycloak:Issuer with AUTH_KEYCLOAK_ISSUER.",
      },
    ]);
  });
});
