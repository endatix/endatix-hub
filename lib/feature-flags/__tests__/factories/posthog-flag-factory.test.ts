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

const createPostHogAdapter = vi.hoisted(() => vi.fn());

vi.mock("@flags-sdk/posthog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flags-sdk/posthog")>();
  createPostHogAdapter.mockImplementation(actual.createPostHogAdapter);
  return { ...actual, createPostHogAdapter };
});

const flagCalls: Array<{ adapter: unknown; key: string }> = [];

vi.mock("flags/next", () => ({
  dedupe: (fn: unknown) => fn,
  flag: (options: { adapter: unknown; key: string }) => {
    flagCalls.push({ adapter: options.adapter, key: options.key });
    return async () => ({ source: "posthog" });
  },
}));

import { PostHogFlagFactory } from "@/lib/feature-flags/factories/posthog-flag-factory";

describe("PostHogFlagFactory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    flagCalls.length = 0;
    createPostHogAdapter.mockClear();
    process.env = { ...originalEnv };
    process.env.POSTHOG_PROJECT_API_KEY = "phc_from_project_api_key";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
    delete process.env.ENDATIX_POSTHOG_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("passes POSTHOG_PROJECT_API_KEY into createPostHogAdapter, not ENDATIX_POSTHOG_KEY", () => {
    process.env.ENDATIX_POSTHOG_KEY = "phc_legacy_ignored";

    new PostHogFlagFactory();

    expect(createPostHogAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        postHogKey: "phc_from_project_api_key",
        postHogOptions: expect.objectContaining({
          host: "https://eu.i.posthog.com",
        }),
      }),
    );
  });

  it("does not pass a reverse-proxy path as the Node host", () => {
    process.env.POSTHOG_HOST = "/ingest";

    new PostHogFlagFactory();

    expect(createPostHogAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        postHogOptions: expect.objectContaining({
          host: "https://us.i.posthog.com",
        }),
      }),
    );
  });

  it("wires flags/next to the v1 callable adapter (value) and .payload", () => {
    const factory = new PostHogFlagFactory();

    factory.createFlag({ key: "ai-features", defaultValue: false });
    factory.createFlag({
      key: "object-flag",
      defaultValue: { enabled: false },
    });

    expect(flagCalls).toHaveLength(2);
    expect(typeof flagCalls[0]?.adapter).toBe("function");
    expect(flagCalls[0]?.adapter).not.toHaveProperty("isFeatureEnabled");
    expect(typeof flagCalls[1]?.adapter).toBe("function");
  });

  it("applies parsePayload to the PostHog result", async () => {
    const factory = new PostHogFlagFactory();
    const evaluate = factory.createFlag({
      key: "parsed-flag",
      defaultValue: { enabled: false },
      parsePayload: (payload) => ({
        enabled: (payload as { source: string }).source === "posthog",
      }),
    });

    expect(await evaluate()).toEqual({ enabled: true });
  });
});
