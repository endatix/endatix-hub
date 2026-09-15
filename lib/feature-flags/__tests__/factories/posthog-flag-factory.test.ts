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
const hoisted = vi.hoisted(() => ({
  realCreatePostHogAdapter: undefined as never,
}));

vi.mock("@flags-sdk/posthog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flags-sdk/posthog")>();
  hoisted.realCreatePostHogAdapter = actual.createPostHogAdapter as never;
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
    process.env.POSTHOG_PROJECT_TOKEN = "phc_from_project_token";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("passes POSTHOG_PROJECT_TOKEN into createPostHogAdapter", () => {
    new PostHogFlagFactory();

    expect(createPostHogAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        postHogKey: "phc_from_project_token",
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

  it("wires flags/next to the v1 callable adapter, never the v0 builders", () => {
    const factory = new PostHogFlagFactory();

    factory.createFlag({ key: "ai-features", defaultValue: false });
    factory.createFlag({
      key: "object-flag",
      defaultValue: { enabled: false },
    });

    expect(flagCalls).toHaveLength(2);
    // Value flags pass the callable adapter itself; payload flags pass a resolved adapter.
    expect(typeof flagCalls[0]?.adapter).toBe("function");
    expect(flagCalls[0]?.adapter).not.toHaveProperty("isFeatureEnabled");
    expect(flagCalls[1]?.adapter).toHaveProperty("decide");
  });

  describe("parsePayload", () => {
    // mockClear() in the outer beforeEach keeps implementations, so restore the real one.
    afterEach(() => {
      createPostHogAdapter.mockImplementation(hoisted.realCreatePostHogAdapter);
    });

    const definition = {
      key: "parsed-flag",
      defaultValue: { enabled: false },
      parsePayload: (payload: unknown) => ({
        enabled: (payload as { source?: string }).source === "posthog",
      }),
    };

    /** Drives the adapter handed to `flags/next`, which is where parsing now happens. */
    function decideWith(payload: unknown) {
      createPostHogAdapter.mockReturnValue(
        Object.assign(() => ({ decide: vi.fn() }), {
          payload: () => ({
            decide: async ({ defaultValue }: { defaultValue?: unknown }) =>
              payload === MISSING ? defaultValue : payload,
          }),
        }),
      );

      new PostHogFlagFactory().createFlag(definition);
      const adapter = flagCalls.at(-1)?.adapter as {
        decide: (params: Record<string, unknown>) => Promise<unknown>;
      };
      return adapter.decide({ key: definition.key });
    }

    const MISSING = Symbol("missing");

    it("parses a real PostHog payload", async () => {
      expect(await decideWith({ source: "posthog" })).toEqual({
        enabled: true,
      });
    });

    // The parser expects raw PostHog JSON. Handing it Hub's own typed default would
    // transform it — or throw — instead of returning the default unchanged.
    it("returns defaultValue untouched when PostHog has no payload", async () => {
      expect(await decideWith(MISSING)).toBe(definition.defaultValue);
    });
  });
});
