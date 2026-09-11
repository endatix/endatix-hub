import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    username: "test-user",
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    isLoggedIn: true,
  }),
}));

vi.mock("@flags-sdk/posthog", () => ({
  createPostHogAdapter: vi.fn(() => ({
    isFeatureEnabled: vi.fn(() => ({})),
    featureFlagValue: vi.fn(() => ({})),
    featureFlagPayload: vi.fn(() => ({})),
  })),
}));

vi.mock("flags/next", () => ({
  dedupe: (fn: unknown) => fn,
  flag: () => async () => false,
}));

import { flag } from "@/lib/feature-flags/utils";
import { flagFactoryProvider } from "@/lib/feature-flags/factories/flag-factory-provider";

describe("flag runtime factory selection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ENABLE_POSTHOG_ADAPTER;
    delete process.env.ENDATIX_POSTHOG_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses PostHog when adapter env is set after flag() is defined", async () => {
    const evaluate = flag({ key: "ai-features", defaultValue: false });

    process.env.ENABLE_POSTHOG_ADAPTER = "true";
    process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";

    await evaluate();

    expect(flagFactoryProvider.getFactory().constructor.name).toBe(
      "PostHogFlagFactory",
    );
  });
});
