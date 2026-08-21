import { describe, expect, it } from "vitest";
import {
  identityStepError,
  roleHasHubAccess,
  suggestedTenantSlug,
} from "../tenant-self-registration";

describe("tenant-self-registration", () => {
  it("keeps a manually edited slug", () => {
    expect(suggestedTenantSlug("Acme Surveys", "custom", true)).toBe("custom");
  });

  it("derives the slug from the name until the user edits it", () => {
    expect(suggestedTenantSlug("Acme Surveys", "", false)).toBe("acme-surveys");
  });

  it("rejects empty names and reserved slugs", () => {
    expect(identityStepError("  ", "acme")).toBe("Name is required.");
    expect(identityStepError("Admin", "admin")).toBe("This slug is reserved.");
  });

  it("flags Hub-capable default roles", () => {
    expect(roleHasHubAccess("Respondent")).toBe(false);
    expect(roleHasHubAccess("Creator")).toBe(true);
    expect(roleHasHubAccess("Admin")).toBe(true);
  });
});
