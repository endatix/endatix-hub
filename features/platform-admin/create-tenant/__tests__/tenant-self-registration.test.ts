import { describe, expect, it } from "vitest";
import {
  filterTenantAuthProviders,
  identityStepError,
  roleHasHubAccess,
  tenantPublicRegisterPath,
  tenantPublicSignInPath,
} from "../tenant-self-registration";

describe("tenant-self-registration", () => {
  it("rejects empty names", () => {
    expect(identityStepError("  ")).toBe("Name is required.");
    expect(identityStepError("Acme")).toBeNull();
  });

  it("builds the public sign-in path from the opaque id", () => {
    expect(tenantPublicSignInPath("xK9mP2qR")).toBe("/t/xK9mP2qR/signin");
  });

  it("builds the public register path from the opaque id", () => {
    expect(tenantPublicRegisterPath("xK9mP2qR8vNw")).toBe(
      "/t/xK9mP2qR8vNw/register",
    );
  });

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
    expect(filterTenantAuthProviders(providers, [])).toEqual([{ id: "endatix" }]);
  });

  it("builds the public register path from the opaque id", () => {
    expect(tenantPublicRegisterPath("xK9mP2qR8vNw")).toBe(
      "/t/xK9mP2qR8vNw/register",
    );
  });

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
    expect(filterTenantAuthProviders(providers, [])).toEqual([{ id: "endatix" }]);
  });

  it("flags Hub-capable default roles", () => {
    expect(roleHasHubAccess("Respondent")).toBe(false);
    expect(roleHasHubAccess("Creator")).toBe(true);
    expect(roleHasHubAccess("Admin")).toBe(true);
  });
});
