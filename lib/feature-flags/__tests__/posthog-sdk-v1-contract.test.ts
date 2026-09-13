import { describe, expect, it } from "vitest";
import { createPostHogAdapter } from "@flags-sdk/posthog";

describe("@flags-sdk/posthog v1 contract", () => {
  const adapter = createPostHogAdapter({
    postHogKey: "phc_contract_test",
    postHogOptions: { host: "https://us.i.posthog.com" },
  });

  it("returns a callable adapter with a .payload variant", () => {
    expect(typeof adapter).toBe("function");
    expect(typeof adapter.payload).toBe("function");
  });

  it("no longer exposes the pre-v1 builders", () => {
    expect(adapter).not.toHaveProperty("isFeatureEnabled");
    expect(adapter).not.toHaveProperty("featureFlagValue");
    expect(adapter).not.toHaveProperty("featureFlagPayload");
  });
});
