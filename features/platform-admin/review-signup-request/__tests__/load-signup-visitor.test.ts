import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findPostHogPersonUuidBySessionId,
  getPostHogPersonByDistinctId,
  getPostHogPersonByUuid,
  listPostHogPersonEvents,
} from "@/features/analytics/posthog/server/posthog-read-api.server";
import { loadSignupVisitor, toTimeline } from "../load-signup-visitor.server";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/features/analytics/posthog/server/posthog-read-api.server",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/analytics/posthog/server/posthog-read-api.server")
    >()),
    getPostHogPersonByDistinctId: vi.fn(),
    getPostHogPersonByUuid: vi.fn(),
    findPostHogPersonUuidBySessionId: vi.fn(),
    listPostHogPersonEvents: vi.fn(),
  }),
);

describe("loadSignupVisitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTHOG_UI_HOST = "https://us.posthog.com";
    process.env.POSTHOG_PROJECT_ID = "42";
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
  });

  afterEach(() => {
    delete process.env.POSTHOG_UI_HOST;
    delete process.env.POSTHOG_PROJECT_ID;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  it("summarises the person without IP, coordinates or postal code", async () => {
    // Arrange
    vi.mocked(getPostHogPersonByDistinctId).mockResolvedValue({
      uuid: "p-1",
      createdAt: "2026-09-29T05:56:26Z",
      properties: {
        $geoip_city_name: "Sofia",
        $geoip_country_name: "Bulgaria",
        $geoip_time_zone: "Europe/Sofia",
        $geoip_latitude: 42.68,
        $geoip_postal_code: "1000",
        $ip: "203.0.113.7",
        $browser: "Chrome",
        $browser_version: 153,
        $os: "Mac OS X",
        $os_version: "10.15.7",
        $device_type: "Desktop",
        $initial_referring_domain: "$direct",
        $initial_pathname: "/signin",
        $initial_utm_source: "newsletter",
      },
    });
    vi.mocked(listPostHogPersonEvents).mockResolvedValue([]);

    // Act
    const lookup = await loadSignupVisitor({
      distinctId: "anon-1",
      sessionId: null,
    });

    // Assert
    expect(lookup).toEqual({
      status: "found",
      visitor: {
        profileHref: "https://us.posthog.com/project/42/persons/anon-1",
        firstSeenAt: "2026-09-29T05:56:26Z",
        location: "Sofia, Bulgaria",
        timeZone: "Europe/Sofia",
        browser: "Chrome 153",
        os: "Mac OS X 10.15.7",
        device: "Desktop",
        cameFrom: "Direct visit (no referrer)",
        campaign: "newsletter",
        landingPage: "/signin",
        timeline: [],
      },
    });
    expect(JSON.stringify(lookup)).not.toMatch(/203\.0\.113|42\.68|1000"/);
  });

  it("still links to PostHog when it has no person for the id", async () => {
    // Arrange
    vi.mocked(getPostHogPersonByDistinctId).mockResolvedValue(null);

    // Act & Assert
    await expect(
      loadSignupVisitor({ distinctId: "anon-1", sessionId: null }),
    ).resolves.toEqual({
      status: "missing",
      profileHref: "https://us.posthog.com/project/42/persons/anon-1",
    });
  });

  it("finds the person through the session when no distinct id was stored", async () => {
    // Arrange
    vi.mocked(findPostHogPersonUuidBySessionId).mockResolvedValue("p-uuid");
    vi.mocked(getPostHogPersonByUuid).mockResolvedValue({
      uuid: "p-uuid",
      createdAt: null,
      properties: { $geoip_country_name: "Bulgaria" },
    });
    vi.mocked(listPostHogPersonEvents).mockResolvedValue([]);

    // Act
    const lookup = await loadSignupVisitor({
      distinctId: null,
      sessionId: "sess-1",
    });

    // Assert
    expect(getPostHogPersonByDistinctId).not.toHaveBeenCalled();
    expect(lookup.status).toBe("found");
    expect(lookup.status === "found" && lookup.visitor.profileHref).toBe(
      "https://us.posthog.com/project/42/persons/p-uuid",
    );
    expect(lookup.status === "found" && lookup.visitor.location).toBe(
      "Bulgaria",
    );
  });

  it("reports unavailable when a session-only visitor is unknown", async () => {
    // Arrange
    vi.mocked(findPostHogPersonUuidBySessionId).mockResolvedValue(null);

    // Act & Assert
    await expect(
      loadSignupVisitor({ distinctId: null, sessionId: "sess-1" }),
    ).resolves.toEqual({ status: "unavailable", profileHref: null });
  });

  it("reports unavailable without config", async () => {
    // Arrange
    delete process.env.POSTHOG_PERSONAL_API_KEY;

    // Act & Assert
    await expect(
      loadSignupVisitor({ distinctId: "anon-1", sessionId: null }),
    ).resolves.toEqual({
      status: "unavailable",
      profileHref: null,
    });
    expect(getPostHogPersonByDistinctId).not.toHaveBeenCalled();
  });
});

describe("toTimeline", () => {
  it("reads oldest first, folds repeats and marks the signup", () => {
    // Act
    const steps = toTimeline([
      { event: "signup_requested", timestamp: "t4", pathname: "/signup" },
      { event: "$pageview", timestamp: "t3", pathname: "/signup" },
      { event: "$pageview", timestamp: "t2", pathname: "/signup" },
      { event: "$pageview", timestamp: "t1", pathname: "/share/1" },
    ]);

    // Assert
    expect(steps).toEqual([
      { kind: "pageview", label: "Viewed /share/1", timestamp: "t1", count: 1 },
      { kind: "pageview", label: "Viewed /signup", timestamp: "t2", count: 2 },
      {
        kind: "signup",
        label: "Requested a workspace",
        timestamp: "t4",
        count: 1,
      },
    ]);
  });
});
