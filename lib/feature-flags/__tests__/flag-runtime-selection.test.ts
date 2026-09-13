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

vi.mock("flags/next", () => ({
  dedupe: (fn: unknown) => fn,
  flag: () => async () => POSTHOG_VALUE,
}));

import { flag } from "@/lib/feature-flags/utils";
import { flagFactoryProvider } from "@/lib/feature-flags/factories/flag-factory-provider";

describe("flag runtime factory selection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FLAG_PROVIDER;
    delete process.env.POSTHOG_PROJECT_API_KEY;
    delete process.env.ENABLE_POSTHOG_ADAPTER;
    delete process.env.ENDATIX_POSTHOG_KEY;
    delete process.env.FLAG_AI_FEATURES;
    flagFactoryProvider.resetForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    flagFactoryProvider.resetForTests();
  });

  it("uses PostHog when FLAG_PROVIDER and project key are set before first evaluation", async () => {
    process.env.FLAG_PROVIDER = "posthog";
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";

    const evaluate = flag({ key: "ai-features", defaultValue: false });

    expect(await evaluate()).toBe(POSTHOG_VALUE);
  });

  it("does not switch to PostHog when env is set after the first evaluation", async () => {
    const evaluate = flag({ key: "ai-features", defaultValue: false });

    expect(await evaluate()).toBe(false);

    process.env.FLAG_PROVIDER = "posthog";
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";

    expect(await evaluate()).toBe(false);
  });

  it("does not switch to PostHog when only the pre-v1 env names are set", async () => {
    const evaluate = flag({ key: "ai-features", defaultValue: false });

    process.env.ENABLE_POSTHOG_ADAPTER = "true";
    process.env.ENDATIX_POSTHOG_KEY = "phc_test_key";

    expect(await evaluate()).toBe(false);
  });

  it("does not switch back to environment flags after PostHog is frozen", async () => {
    process.env.FLAG_PROVIDER = "posthog";
    process.env.POSTHOG_PROJECT_API_KEY = "phc_test_key";

    const evaluate = flag({ key: "ai-features", defaultValue: false });
    expect(await evaluate()).toBe(POSTHOG_VALUE);

    process.env.FLAG_PROVIDER = "environment";
    expect(await evaluate()).toBe(POSTHOG_VALUE);
  });
});
