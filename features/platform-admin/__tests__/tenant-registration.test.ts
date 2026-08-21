import { describe, expect, it } from "vitest";
import {
  filterTenantAuthProviders,
  roleHasHubAccess,
  TENANT_REGISTRATION_ROLES,
  tenantNameError,
  tenantPublicRegisterPath,
  tenantPublicSignInPath,
} from "../tenant-registration";

describe("tenantNameError", () => {
  it("rejects missing and blank names", () => {
    expect(tenantNameError("  ")).toBe("Name is required.");
    expect(tenantNameError(undefined)).toBe("Name is required.");
    expect(tenantNameError("Acme")).toBeNull();
  });
});

describe("roleHasHubAccess", () => {
  it("flags Hub-capable default roles", () => {
    expect(roleHasHubAccess("Respondent")).toBe(false);
    expect(roleHasHubAccess("Creator")).toBe(true);
    expect(roleHasHubAccess("Admin")).toBe(true);
  });

  it("does not imply Hub access for unknown roles", () => {
    expect(roleHasHubAccess("Unknown")).toBe(false);
  });

  it("offers Respondent as the first option", () => {
    expect(TENANT_REGISTRATION_ROLES[0]?.name).toBe("Respondent");
  });
});

describe("tenantPublicSignInPath", () => {
  it("builds the Hub sign-in path from ShortUrl", () => {
    expect(tenantPublicSignInPath("xk9mp2qr")).toBe("/t/xk9mp2qr/signin");
  });
});

describe("tenantPublicRegisterPath", () => {
  it("builds the public register path from the opaque id", () => {
    expect(tenantPublicRegisterPath("xk9mp2qr")).toBe("/t/xk9mp2qr/register");
  });
});

describe("filterTenantAuthProviders", () => {
  it("keeps Endatix credentials and filters other providers by the allow list", () => {
    const providers = [
      { id: "endatix" },
      { id: "google" },
      { id: "keycloak" },
    ];

    expect(filterTenantAuthProviders(providers, ["google"])).toEqual([
      { id: "endatix" },
      { id: "google" },
    ]);
    expect(filterTenantAuthProviders(providers, [])).toEqual([
      { id: "endatix" },
    ]);
  });
});
