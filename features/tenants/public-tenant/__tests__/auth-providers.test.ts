import { describe, expect, it } from "vitest";
import { filterTenantAuthProviders } from "../auth-providers";

describe("filterTenantAuthProviders", () => {
  const providers = [{ id: "endatix" }, { id: "google" }, { id: "keycloak" }];

  it("keeps Endatix credentials and filters other providers by the allow list", () => {
    expect(filterTenantAuthProviders(providers, ["google"])).toEqual([
      { id: "endatix" },
      { id: "google" },
    ]);
  });

  it("keeps Endatix credentials when the allow list is empty", () => {
    expect(filterTenantAuthProviders(providers, [])).toEqual([
      { id: "endatix" },
    ]);
  });

  it("matches allow-list entries case-insensitively", () => {
    expect(filterTenantAuthProviders(providers, ["KeyCloak"])).toEqual([
      { id: "endatix" },
      { id: "keycloak" },
    ]);
  });
});
