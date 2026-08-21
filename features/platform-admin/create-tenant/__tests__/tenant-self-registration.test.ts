import { describe, expect, it } from "vitest";
import {
  identityStepError,
  roleHasHubAccess,
  tenantPublicSignInPath,
} from "../tenant-self-registration";

describe("tenant-self-registration", () => {
  it("rejects empty names", () => {
    expect(identityStepError("  ")).toBe("Name is required.");
    expect(identityStepError("Acme")).toBeNull();
  });

  it("builds the public sign-in path from the opaque id", () => {
    expect(tenantPublicSignInPath("xK9mP2qR8vNw")).toBe("/t/xK9mP2qR8vNw/signin");
  });

  it("flags Hub-capable default roles", () => {
    expect(roleHasHubAccess("Respondent")).toBe(false);
    expect(roleHasHubAccess("Creator")).toBe(true);
    expect(roleHasHubAccess("Admin")).toBe(true);
  });
});
