import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPostHogPersonByDistinctId,
  listPostHogPersonEvents,
  readPostHogReadApiConfig,
} from "../server/posthog-read-api.server";

vi.mock("server-only", () => ({}));

const config = {
  host: "https://us.posthog.com",
  projectId: "42",
  apiKey: "phx_test",
};

describe("readPostHogReadApiConfig", () => {
  afterEach(() => {
    delete process.env.POSTHOG_UI_HOST;
    delete process.env.POSTHOG_PROJECT_ID;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  it("is null until host, project and key are all set", () => {
    // Arrange
    process.env.POSTHOG_UI_HOST = "https://us.posthog.com";
    process.env.POSTHOG_PROJECT_ID = "42";

    // Act & Assert
    expect(readPostHogReadApiConfig()).toBeNull();

    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    expect(readPostHogReadApiConfig()).toEqual(config);
  });
});

describe("PostHog read API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the person on a 200", async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        results: [
          { uuid: "p-1", created_at: "t0", properties: { $browser: "Chrome" } },
        ],
      }),
    );

    // Act
    const person = await getPostHogPersonByDistinctId(config, "anon-1");

    // Assert
    expect(person).toEqual({
      status: "ok",
      value: {
        uuid: "p-1",
        createdAt: "t0",
        properties: { $browser: "Chrome" },
      },
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://us.posthog.com/api/projects/42/persons/?distinct_id=anon-1",
    );
  });

  it("is absent when the project has no such person", async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(Response.json({ results: [] }));

    // Act & Assert
    await expect(
      getPostHogPersonByDistinctId(config, "anon-1"),
    ).resolves.toEqual({ status: "absent" });
  });

  it("is unavailable when PostHog returns an error", async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    // Act & Assert
    await expect(
      getPostHogPersonByDistinctId(config, "anon-1"),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("is unavailable when the request throws", async () => {
    // Arrange
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));

    // Act & Assert
    await expect(listPostHogPersonEvents(config, "p-1", 10)).resolves.toEqual({
      status: "unavailable",
    });
  });
});
