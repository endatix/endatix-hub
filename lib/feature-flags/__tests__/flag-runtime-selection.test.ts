import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Any value the environment factory cannot produce, so the source is unambiguous. */
const POSTHOG_VALUE = true;

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
  flag: () => async () => POSTHOG_VALUE,
}));

import { flag } from "@/lib/feature-flags/utils";

describe("flag runtime factory selection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ENABLE_POSTHOG_ADAPTER;
    delete process.env.ENDATIX_POSTHOG_KEY;
    delete process.env.FLAG_AI_FEATURES;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // The regression this guards: binding the factory when `flag()` is called leaves a
  // container started with PostHog credentials permanently on environment flags.
  it("switches to PostHog when the adapter env is set after flag() is defined", async () => {
    const evaluate = flag({ key: "ai-features", defaultValue: false });

    expect(await evaluate()).toBe(false);

    process.env.ENABLE_POSTHOG_ADAPTER = "true";
    process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";

    expect(await evaluate()).toBe(POSTHOG_VALUE);
  });
});
